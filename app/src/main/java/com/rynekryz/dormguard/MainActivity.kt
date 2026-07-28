package com.rynekryz.dormguard

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.color.DynamicColors
import com.rynekryz.dormguard.bridge.WebAppInterface
import com.rynekryz.dormguard.notifications.DoorLogService
import com.rynekryz.dormguard.webview.WebViewConfig

class MainActivity : AppCompatActivity() {
    private lateinit var webViewConfig: WebViewConfig
    private var webInterface: WebAppInterface? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val sharedPrefs = getSharedPreferences("dormguard", Context.MODE_PRIVATE)
        if (sharedPrefs.getBoolean("dynamic_color_enabled", false)) {
            DynamicColors.applyToActivityIfAvailable(this)
        }

        createNotificationChannel()
        restoreNotificationService()
        webViewConfig = WebViewConfig(this)
        setContentView(webViewConfig.webView)
        webInterface = WebAppInterface(this, webViewConfig.webView)
        webViewConfig.webView.addJavascriptInterface(webInterface!!, "Android")
        webViewConfig.loadApp()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == WebAppInterface.RESTORE_FILE_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            data?.data?.let { uri ->
                webInterface?.onRestoreFileSelected(uri)
            }
        } else if (requestCode == WebViewConfig.FILE_CHOOSER_REQUEST_CODE) {
            val uri = if (resultCode == Activity.RESULT_OK) data?.data else null
            webViewConfig.onFileChooserResult(uri)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            WebAppInterface.PERMISSION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    webInterface?.showFrequencyDialog()
                } else {
                    val sharedPrefs = getSharedPreferences("dormguard", Context.MODE_PRIVATE)
                    sharedPrefs.edit().putBoolean("notifications_enabled", false).apply()
                }
            }
            WebViewConfig.CAMERA_PERMISSION_REQUEST_CODE -> {
                val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
                webViewConfig.onCameraPermissionResult(granted)
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "dormguard_alerts",
                "Door Alerts",
                NotificationManager.IMPORTANCE_HIGH
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun restoreNotificationService() {
        val sharedPrefs = getSharedPreferences("dormguard", Context.MODE_PRIVATE)
        val notifEnabled = sharedPrefs.getBoolean("notifications_enabled", false)
        if (notifEnabled) {
            val intent = Intent(this, DoorLogService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                @Suppress("DEPRECATION")
                startService(intent)
            }
        }
    }
}