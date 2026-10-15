package com.bellmontexpress.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Bellmont Express: the live site in a full-screen app.
 *
 * The site is loaded from the web rather than bundled, so every deploy reaches
 * the app without a new APK. What the activity adds is what a bare WebView
 * gets wrong for this site:
 *
 *  - window.print() is a no-op in WebView. It is routed to Android's print
 *    service, which can also save as PDF — receipts and letters print.
 *  - window.open() pop-ups (the receipt opens in its own window) are shown
 *    in an overlay with Print and Close.
 *  - File inputs (chat attachments) open the system picker.
 *  - Links to other sites, mail and phone numbers leave the app.
 *  - A failed load shows an offline page with Retry instead of an error.
 */
public class MainActivity extends Activity {

    private static final int FILE_REQUEST = 41;
    private static final String OFFLINE_URL = "file:///android_asset/offline.html";
    private static final Set<String> APP_HOSTS =
            new HashSet<>(Arrays.asList(BuildConfig.APP_HOSTS.split(",")));

    /* Routes window.print() to the bridge. Runs at document start in every
       frame, so it is in place before any page script calls print(). */
    private static final String PRINT_SHIM =
            "(function(){if(!window.BXApp)return;"
            + "window.print=function(){BXApp.print(document.title||'Bellmont Express');};})();";

    private FrameLayout root;
    private WebView web;
    private View popupContainer;
    private WebView popup;
    private ValueCallback<Uri[]> fileCallback;
    private String lastFailedUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);
        applySystemBarInsets(root);

        web = createWebView();
        root.addView(web, match());
        setContentView(root);

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl(BuildConfig.START_URL);
        }
    }

    /* targetSdk 35 draws edge to edge; keep content clear of the status bar,
       navigation bar and keyboard. */
    private void applySystemBarInsets(View view) {
        view.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            }
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private WebView createWebView() {
        WebView view = new WebView(this);
        view.setBackgroundColor(Color.WHITE);

        WebSettings s = view.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setUseWideViewPort(true);        // honour each page's viewport meta
        s.setLoadWithOverviewMode(true);   // fit wide documents (receipts) to the screen
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " BellmontExpressApp/" + BuildConfig.VERSION_NAME);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, true);

        // The bridge only prints and retries; nothing on it reads app state.
        view.addJavascriptInterface(new Bridge(view), "BXApp");
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(view, PRINT_SHIM, Collections.singleton("*"));
        }

        view.setWebViewClient(new AppClient());
        view.setWebChromeClient(new AppChrome());
        view.setDownloadListener((url, ua, disposition, mime, length) -> openExternal(Uri.parse(url)));
        return view;
    }

    /* ── Navigation ───────────────────────────────────────────────────── */

    private boolean isAppUrl(Uri uri) {
        String scheme = uri.getScheme();
        if ("file".equals(scheme) || "about".equals(scheme) || "blob".equals(scheme) || "data".equals(scheme)) {
            return true;
        }
        return ("https".equals(scheme) || "http".equals(scheme))
                && uri.getHost() != null && APP_HOSTS.contains(uri.getHost().toLowerCase());
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // No app on the phone can open it; stay where we are.
        }
    }

    private class AppClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isAppUrl(uri)) return false;
            openExternal(uri);
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            // Older WebViews without document-start scripts get the shim here.
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                view.evaluateJavascript(PRINT_SHIM, null);
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame() && view == web) {
                lastFailedUrl = request.getUrl().toString();
                view.loadUrl(OFFLINE_URL);
            }
        }
    }

    /* ── Pop-up windows, file picker ──────────────────────────────────── */

    private class AppChrome extends WebChromeClient {
        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
            closePopup();
            popup = createWebView();
            popupContainer = buildPopupContainer(popup);
            root.addView(popupContainer, match());

            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
            transport.setWebView(popup);
            resultMsg.sendToTarget();
            return true;
        }

        @Override
        public void onCloseWindow(WebView window) {
            if (window == popup) closePopup();
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                startActivityForResult(params.createIntent(), FILE_REQUEST);
                return true;
            } catch (ActivityNotFoundException e) {
                fileCallback = null;
                return false;
            }
        }
    }

    private View buildPopupContainer(WebView child) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setBackgroundColor(Color.WHITE);

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setBackgroundColor(Color.parseColor("#1D2B59"));
        int pad = dp(8);
        bar.setPadding(dp(12), pad, pad, pad);

        TextView title = new TextView(this);
        title.setText(R.string.app_name);
        title.setTextColor(Color.WHITE);
        title.setTextSize(15);
        bar.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button print = barButton("Print", true);
        print.setOnClickListener(v -> printWebView(child, child.getTitle()));
        bar.addView(print);

        Button close = barButton("Close", false);
        close.setOnClickListener(v -> closePopup());
        bar.addView(close);

        box.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        box.addView(child, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        return box;
    }

    private Button barButton(String label, boolean primary) {
        Button b = new Button(this);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextColor(primary ? Color.parseColor("#1D2B59") : Color.WHITE);
        b.setBackgroundColor(primary ? Color.parseColor("#F6A23A") : Color.TRANSPARENT);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.leftMargin = dp(6);
        b.setLayoutParams(lp);
        return b;
    }

    private void closePopup() {
        if (popupContainer != null) {
            root.removeView(popupContainer);
            popupContainer = null;
        }
        if (popup != null) {
            popup.destroy();
            popup = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_REQUEST) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                fileCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    /* ── Printing ─────────────────────────────────────────────────────── */

    private void printWebView(WebView view, String title) {
        String job = (title == null || title.trim().isEmpty()) ? getString(R.string.app_name) : title;
        PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
        if (pm == null) return;
        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(job);
        pm.print(job, adapter, new PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.NA_LETTER)
                .build());
    }

    /** Exposed to page script as window.BXApp. */
    private class Bridge {
        private final WebView owner;

        Bridge(WebView owner) {
            this.owner = owner;
        }

        @JavascriptInterface
        public void print(String title) {
            runOnUiThread(() -> printWebView(owner, title));
        }

        @JavascriptInterface
        public void retry() {
            runOnUiThread(() -> owner.loadUrl(lastFailedUrl != null ? lastFailedUrl : BuildConfig.START_URL));
        }
    }

    /* ── Lifecycle ────────────────────────────────────────────────────── */

    @Override
    public void onBackPressed() {
        if (popup != null) {
            if (popup.canGoBack()) popup.goBack(); else closePopup();
            return;
        }
        if (web.canGoBack()) {
            web.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        closePopup();
        if (web != null) web.destroy();
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static FrameLayout.LayoutParams match() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }
}
