package com.rynekryz.dormguard.notifications

import android.app.Notification
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.net.URL

class DoorLogService : Service() {

    private var pollingJob: kotlinx.coroutines.Job? = null
    private val scope = CoroutineScope(Dispatchers.IO)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val sharedPrefs = getSharedPreferences("dormguard", Context.MODE_PRIVATE)
        val intervalSeconds = sharedPrefs.getInt("polling_interval", 3) * 60

        startForeground(NOTIFICATION_ID, createNotification())
        startPolling(intervalSeconds)

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        pollingJob?.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("DormGuard")
            .setContentText("Monitoring door activity...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun startPolling(intervalSeconds: Int) {
        pollingJob?.cancel()
        pollingJob = scope.launch {
            while (true) {
                try {
                    val sharedPrefs = getSharedPreferences("dormguard", Context.MODE_PRIVATE)
                    val logsUrl = sharedPrefs.getString("logs_url", null)

                    if (logsUrl != null) {
                        val response = URL(logsUrl).readText()
                        val jsonArray = JSONArray(response)

                        if (jsonArray.length() > 0) {
                            val latestEntry = jsonArray.getJSONObject(0)
                            val status = latestEntry.optString("status", "CLOSED")
                            val lastStatus = sharedPrefs.getString("last_door_status", "")

                            if (status != lastStatus) {
                                showNotification("Door is now $status")
                                sharedPrefs.edit().putString("last_door_status", status).apply()
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                delay((intervalSeconds * 1000L).coerceAtLeast(1000))
            }
        }
    }

    private fun showNotification(message: String) {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("DormGuard")
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(200, 100, 200))
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(2, notification)
    }

    companion object {
        const val NOTIFICATION_ID = 1
        const val CHANNEL_ID = "dormguard_alerts"
    }
}