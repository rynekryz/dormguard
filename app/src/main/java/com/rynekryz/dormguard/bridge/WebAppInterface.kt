package com.rynekryz.dormguard.bridge

import android.app.Activity
import android.content.Context
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.MediaStore
import android.provider.Settings
import android.view.View
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.work.WorkManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.rynekryz.dormguard.notifications.DoorLogPollingWorker
import com.rynekryz.dormguard.notifications.DoorLogService
import org.json.JSONArray
import java.util.concurrent.TimeUnit

class WebAppInterface(private val context: Context) {

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
                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    }
                }
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                uri?.let {
                    resolver.openOutputStream(it)?.use { stream ->
                        stream.write(content.toByteArray())
                    }
                    Toast.makeText(context, "Saved to Downloads: $filename", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun saveFileWithConfirm(filename: String, content: String, mimeType: String, promptTitle: String) {
        val activity = context as? Activity ?: return
        activity.runOnUiThread {
            MaterialAlertDialogBuilder(activity)
                .setTitle(promptTitle)
                .setMessage("Download \"$filename\"?")
                .setPositiveButton("Yes") { _, _ ->
                    saveFile(filename, content, mimeType)
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    @JavascriptInterface
    fun confirmOpenInBrowser(url: String) {
        val activity = context as? Activity ?: return
        activity.runOnUiThread {
            MaterialAlertDialogBuilder(activity)
                .setTitle("Open in browser?")
                .setMessage(url)
                .setPositiveButton("Yes") { _, _ ->
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    context.startActivity(intent)
                }
                .setNegativeButton("Cancel", null)
                .show()
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

    companion object {
        const val PERMISSION_REQUEST_CODE = 1001
    }
}