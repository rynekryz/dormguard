package com.rynekryz.dormguard.webview

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.rynekryz.dormguard.bridge.WebAppInterface
import org.json.JSONObject

class WebViewConfig(private val activity: AppCompatActivity) {
    val webView: WebView = WebView(activity).apply {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false

        webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                view.evaluateJavascript(
                    """
                    navigator.vibrate = function(pattern) {
                        if (window.Android) {
                            var arr = Array.isArray(pattern) ? pattern : [pattern];
                            window.Android.vibrate(JSON.stringify(arr));
                        }
                        return true;
                    };
                    """.trimIndent(),
                    null
                )
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                return if (url.startsWith("file:///android_asset/")) {
                    false
                } else {
                    view.evaluateJavascript(
                        "if (typeof window.confirmOpenInBrowser === 'function') { window.confirmOpenInBrowser(${JSONObject.quote(url)}); }",
                        null
                    )
                    true
                }
            }
        }

        webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                activity.runOnUiThread {
                    val wantsCamera = request.resources.any { it == PermissionRequest.RESOURCE_VIDEO_CAPTURE }
                    if (!wantsCamera) {
                        request.deny()
                        return@runOnUiThread
                    }

                    val hasPermission = ContextCompat.checkSelfPermission(
                        activity,
                        Manifest.permission.CAMERA
                    ) == PackageManager.PERMISSION_GRANTED

                    if (hasPermission) {
                        request.grant(request.resources)
                    } else {
                        pendingPermissionRequest = request
                        ActivityCompat.requestPermissions(
                            activity,
                            arrayOf(Manifest.permission.CAMERA),
                            CAMERA_PERMISSION_REQUEST_CODE
                        )
                    }
                }
            }

            override fun onShowFileChooser(
                view: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                pendingFileChooserCallback?.onReceiveValue(null)
                pendingFileChooserCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                }

                return try {
                    activity.startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                    true
                } catch (e: Exception) {
                    pendingFileChooserCallback = null
                    false
                }
            }
        }
    }

    private var pendingPermissionRequest: PermissionRequest? = null
    private var pendingFileChooserCallback: ValueCallback<Array<Uri>>? = null

    fun onCameraPermissionResult(granted: Boolean) {
        val request = pendingPermissionRequest ?: return
        pendingPermissionRequest = null
        if (granted) {
            request.grant(request.resources)
        } else {
            request.deny()
        }
    }

    fun onFileChooserResult(resultUri: Uri?) {
        val callback = pendingFileChooserCallback ?: return
        pendingFileChooserCallback = null
        callback.onReceiveValue(if (resultUri != null) arrayOf(resultUri) else null)
    }

    fun loadApp() {
        webView.loadUrl("file:///android_asset/index.html")
    }

    companion object {
        const val CAMERA_PERMISSION_REQUEST_CODE = 2001
        const val FILE_CHOOSER_REQUEST_CODE = 2002
    }
}