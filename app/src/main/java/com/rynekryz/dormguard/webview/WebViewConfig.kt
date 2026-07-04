package com.rynekryz.dormguard.webview

import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.rynekryz.dormguard.bridge.WebAppInterface
import org.json.JSONObject

class WebViewConfig(private val activity: AppCompatActivity) {

    val webView: WebView = WebView(activity).apply {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true

	  addJavascriptInterface(WebAppInterface(activity), "Android")

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
                        "window.Android && window.Android.confirmOpenInBrowser(${JSONObject.quote(url)});",
                        null
                    )
                    true
                }
            }
        }
    }

    fun loadApp() {
        webView.loadUrl("file:///android_asset/index.html")
    }
}