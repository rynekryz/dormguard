package com.rynekryz.dormguard.bridge

import android.app.Activity
import android.content.Context
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.MediaStore
import android.provider.Settings
import android.util.Base64
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.work.WorkManager
import com.google.android.material.color.DynamicColors
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.rynekryz.dormguard.notifications.DoorLogPollingWorker
import com.rynekryz.dormguard.notifications.DoorLogService
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

class WebAppInterface(private val context: Context, private val webView: WebView? = null) {

    @JavascriptInterface
    fun setStatusBarIconsLight(useLightIcons: Boolean) {
        val activity = context as? Activity ?: return
        activity.runOnUiThread {
            val decorView = activity.window.decorView
            var flags = decorView.systemUiVisibility
            flags = if (useLightIcons) {
                flags and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
            } else {
                flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            }
            decorView.systemUiVisibility = flags
        }
    }

    @JavascriptInterface
    fun setAppTheme(isDark: Boolean) {
        val activity = context as? Activity ?: return
        val currentMode = AppCompatDelegate.getDefaultNightMode()
        val targetMode = if (isDark) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
        if (currentMode == targetMode) return

        activity.runOnUiThread {
            AppCompatDelegate.setDefaultNightMode(targetMode)
        }
    }

    @JavascriptInterface
    fun vibrate(patternJson: String) {
        try {
            val jsonArray = JSONArray(patternJson)
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                manager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (jsonArray.length() == 1) {
                val duration = jsonArray.getLong(0)
                if (duration <= 0) return

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(duration)
                }
            } else {
                val longPattern = LongArray(jsonArray.length()) { i -> jsonArray.getLong(i) }
                if (longPattern.isEmpty()) return

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(longPattern, -1))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(longPattern, -1)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun saveFile(filename: String, content: String, mimeType: String) {
        try {
            val activity = context as? Activity ?: return
            activity.runOnUiThread {
                val resolver = context.contentResolver
                val isImage = mimeType.startsWith("image/")

                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        put(
                            MediaStore.MediaColumns.RELATIVE_PATH,
                            if (isImage) Environment.DIRECTORY_PICTURES else Environment.DIRECTORY_DOWNLOADS
                        )
                    }
                }

                val collection = if (isImage) {
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                } else {
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI
                }

                val uri = resolver.insert(collection, values)
                uri?.let {
                    resolver.openOutputStream(it)?.use { stream ->
                        val bytes = if (isImage) {
                            Base64.decode(content, Base64.DEFAULT)
                        } else {
                            content.toByteArray()
                        }
                        stream.write(bytes)
                    }
                    val location = if (isImage) "Pictures" else "Downloads"
                    Toast.makeText(context, "Saved to $location: $filename", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun saveFileWithConfirm(filename: String, content: String, mimeType: String, promptTitle: String) {
        saveFile(filename, content, mimeType)
    }

    @JavascriptInterface
    fun restoreData() {
        val activity = context as? Activity ?: return
        activity.runOnUiThread {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
            }
            activity.startActivityForResult(intent, RESTORE_FILE_REQUEST_CODE)
        }
    }

    fun onRestoreFileSelected(uri: Uri) {
        try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return
            val reader = BufferedReader(InputStreamReader(inputStream))
            val stringBuilder = StringBuilder()
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                stringBuilder.append(line)
            }
            inputStream.close()

            val jsonContent = stringBuilder.toString()
            val escapedJson = JSONObject.quote(jsonContent)

            val activity = context as? Activity ?: return
            activity.runOnUiThread {
                webView?.evaluateJavascript("if (typeof restoreData === 'function') { restoreData($escapedJson); } else if (window.restoreData) { window.restoreData($escapedJson); }", null)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun openInBrowser(url: String) {
        val activity = context as? Activity ?: return
        activity.runOnUiThread {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            context.startActivity(intent)
        }
    }

    @JavascriptInterface
    fun setNotificationsEnabled(enabled: Boolean) {
        val sharedPrefs = context.getSharedPreferences("dormguard", Context.MODE_PRIVATE)
        sharedPrefs.edit().putBoolean("notifications_enabled", enabled).apply()

        if (enabled) {
            val activity = context as? Activity ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(activity, android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED
                ) {
                    ActivityCompat.requestPermissions(
                        activity,
                        arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                        PERMISSION_REQUEST_CODE
                    )
                    return
                }
            }
            showFrequencyDialog()
        } else {
            stopNotifications()
        }
    }

    @JavascriptInterface
    fun saveDoorLogsUrl(url: String) {
        val sharedPrefs = context.getSharedPreferences("dormguard", Context.MODE_PRIVATE)
        sharedPrefs.edit().putString("logs_url", url).apply()
    }

    fun showFrequencyDialog() {
        val activity = context as? Activity ?: return
        activity.runOnUiThread {
            val options = arrayOf("1 minute", "3 minutes", "15 minutes")
            val values = intArrayOf(1, 3, 15)

            MaterialAlertDialogBuilder(activity)
                .setTitle("Polling frequency")
                .setSingleChoiceItems(options, 0) { dialog, which ->
                    val sharedPrefs = context.getSharedPreferences("dormguard", Context.MODE_PRIVATE)
                    sharedPrefs.edit().putInt("polling_interval", values[which]).apply()
                    startNotifications()
                    dialog.dismiss()
                }
                .setNegativeButton("Cancel") { dialog, _ ->
                    val sharedPrefs = context.getSharedPreferences("dormguard", Context.MODE_PRIVATE)
                    sharedPrefs.edit().putBoolean("notifications_enabled", false).apply()
                    dialog.dismiss()
                }
                .show()
        }
    }

    private fun startNotifications() {
        val intent = Intent(context, DoorLogService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            @Suppress("DEPRECATION")
            context.startService(intent)
        }
    }

    private fun stopNotifications() {
        val intent = Intent(context, DoorLogService::class.java)
        context.stopService(intent)
    }

    @JavascriptInterface
    fun isDynamicColorAvailable(): Boolean {
        return DynamicColors.isDynamicColorAvailable()
    }

    @JavascriptInterface
    fun setDynamicColorEnabled(enabled: Boolean) {
        val sharedPrefs = context.getSharedPreferences("dormguard", Context.MODE_PRIVATE)
        sharedPrefs.edit().putBoolean("dynamic_color_enabled", enabled).apply()

        val activity = context as? Activity ?: return
        activity.runOnUiThread {
            if (enabled && DynamicColors.isDynamicColorAvailable()) {
                DynamicColors.applyToActivityIfAvailable(activity)
            }
            activity.recreate()
        }
    }

    @JavascriptInterface
    fun getMaterialYouColors(isDark: Boolean): String {
        val colors = JSONObject()

        if (DynamicColors.isDynamicColorAvailable() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            colors.put("supported", true)
            colors.put("isDark", isDark)

            val map = if (isDark) darkTones() else lightTones()
            for ((key, resId) in map) {
                colors.put(key, colorToRgbString(context.getColor(resId)))
            }
        } else {
            colors.put("supported", false)
        }

        return colors.toString()
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private fun lightTones(): Map<String, Int> = mapOf(
        "primary" to android.R.color.system_accent1_600,
        "onPrimary" to android.R.color.system_accent1_0,
        "primaryContainer" to android.R.color.system_accent1_100,
        "onPrimaryContainer" to android.R.color.system_accent1_900,
        "background" to android.R.color.system_neutral1_10,
        "onBackground" to android.R.color.system_neutral1_900,
        "surface" to android.R.color.system_neutral1_10,
        "onSurface" to android.R.color.system_neutral1_900,
        "outline" to android.R.color.system_neutral2_500,
        "surfaceContainer" to android.R.color.system_neutral1_50,
        "surfaceContainerHigh" to android.R.color.system_neutral1_100,
        "surfaceDim" to android.R.color.system_neutral1_200,
        "surfaceBright" to android.R.color.system_neutral1_10
    )

    @RequiresApi(Build.VERSION_CODES.S)
    private fun darkTones(): Map<String, Int> = mapOf(
        "primary" to android.R.color.system_accent1_200,
        "onPrimary" to android.R.color.system_accent1_800,
        "primaryContainer" to android.R.color.system_accent1_700,
        "onPrimaryContainer" to android.R.color.system_accent1_100,
        "background" to android.R.color.system_neutral1_900,
        "onBackground" to android.R.color.system_neutral1_100,
        "surface" to android.R.color.system_neutral1_900,
        "onSurface" to android.R.color.system_neutral1_100,
        "outline" to android.R.color.system_neutral2_400,
        "surfaceContainer" to android.R.color.system_neutral1_800,
        "surfaceContainerHigh" to android.R.color.system_neutral1_700,
        "surfaceDim" to android.R.color.system_neutral1_900,
        "surfaceBright" to android.R.color.system_neutral1_600
    )

    private fun colorToRgbString(color: Int): String {
        val r = Color.red(color)
        val g = Color.green(color)
        val b = Color.blue(color)
        return "rgb($r $g $b)"
    }

    companion object {
        const val PERMISSION_REQUEST_CODE = 1001
        const val RESTORE_FILE_REQUEST_CODE = 1002
    }

    @JavascriptInterface
    fun getSystemInfo(): String {
        val info = JSONObject()
        info.put("androidVersion", Build.VERSION.RELEASE)
        info.put("sdkInt", Build.VERSION.SDK_INT)
        info.put("manufacturer", Build.MANUFACTURER)
        info.put("model", Build.MODEL)
        info.put("architecture", Build.SUPPORTED_ABIS.firstOrNull() ?: "unknown")
        return info.toString()
    }
}