package com.rynekryz.dormguard.notifications

import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.URL

class DoorLogPollingWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    try {
        android.util.Log.d("DoorLogPolling", "Worker started")
        
        val sharedPrefs = applicationContext.getSharedPreferences("dormguard", Context.MODE_PRIVATE)
        val logsUrl = sharedPrefs.getString("logs_url", null)
        
        android.util.Log.d("DoorLogPolling", "Logs URL: $logsUrl")
        
        if (logsUrl == null) {
            android.util.Log.d("DoorLogPolling", "No logs URL configured")
            return@withContext Result.retry()
        }

        val response = URL(logsUrl).readText()
        android.util.Log.d("DoorLogPolling", "Response: $response")
        
        val jsonArray = JSONArray(response)

        if (jsonArray.length() > 0) {
            val latestEntry = jsonArray.getJSONObject(0)
            val status = latestEntry.optString("status", "CLOSED")
            val lastStatus = sharedPrefs.getString("last_door_status", "")
            
            android.util.Log.d("DoorLogPolling", "Current status: $status, Last status: $lastStatus")

            if (status != lastStatus) {
                android.util.Log.d("DoorLogPolling", "Status changed, showing notification")
                showNotification("Door is now $status")
                sharedPrefs.edit().putString("last_door_status", status).apply()
            }
        }

        Result.success()
    } catch (e: Exception) {
        android.util.Log.e("DoorLogPolling", "Error", e)
        Result.retry()
    }
}

    private fun showNotification(message: String) {
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("DormGuard")
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(200, 100, 200))
            .build()

        val manager = applicationContext.getSystemService(NotificationManager::class.java)
        manager.notify(2, notification)
    }

    companion object {
        const val CHANNEL_ID = "dormguard_alerts"
        const val WORK_TAG = "door_log_polling"
    }
}