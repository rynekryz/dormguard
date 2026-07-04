package com.rynekryz.dormguard

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.rynekryz.dormguard.bridge.WebAppInterface
import com.rynekryz.dormguard.webview.WebViewConfig

class MainActivity : AppCompatActivity() {

    private lateinit var webViewConfig: WebViewConfig

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webViewConfig = WebViewConfig(this)
        setContentView(webViewConfig.webView)
        webViewConfig.webView.addJavascriptInterface(WebAppInterface(this), "Android")
        webViewConfig.loadApp()
    }
}