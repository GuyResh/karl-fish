package com.karlfish.app

import android.webkit.WebView
import android.webkit.WebSettings
import java.lang.reflect.Field

class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Try to access WebView through reflection to configure it
        // This helps prevent Android density scaling
        try {
            // TauriActivity might have a webView field - try to access it via reflection
            val webViewField: Field? = this::class.java.superclass?.getDeclaredField("webView")
                ?: this::class.java.superclass?.getDeclaredField("mWebView")
            
            webViewField?.let { field ->
                field.isAccessible = true
                val webView = field.get(this) as? WebView
                
                webView?.let { wv ->
                    wv.settings.apply {
                        useWideViewPort = true
                        loadWithOverviewMode = false
                        textZoom = 100
                        // Try to disable density scaling
                        javaClass.getDeclaredMethod("setForceDarkAllowed", Boolean::class.java)
                            .invoke(this, false)
                    }
                    // Set initial scale to prevent automatic scaling
                    wv.setInitialScale(100)
                }
            }
        } catch (e: Exception) {
            // If reflection fails, the viewport meta tag will have to suffice
            android.util.Log.w("MainActivity", "Could not configure WebView via reflection: ${e.message}")
        }
    }
}