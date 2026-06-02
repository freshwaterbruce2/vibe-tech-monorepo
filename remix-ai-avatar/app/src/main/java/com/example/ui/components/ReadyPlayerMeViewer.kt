package com.example.ui.components

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.ui.screens.isEmulatorDevice

private val PulsarAqua = Color(0xFF00E5FF)
private val SoftGray = Color(0xFF90A4AE)

@Composable
fun AvaturnViewer(
    modifier: Modifier = Modifier,
    modelId: String = "Astronaut",
    visemeValue: Int = 0,
    micAmplitude: Float = 0f
) {
    ReadyPlayerMeViewer(modifier, modelId, visemeValue, micAmplitude)
}

@Composable
fun AvaturnCreator(
    modifier: Modifier = Modifier,
    onAvatarCreated: (String) -> Unit,
    onClose: () -> Unit
) {
    ReadyPlayerMeCreator(modifier, onAvatarCreated, onClose)
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ReadyPlayerMeViewer(
    modifier: Modifier = Modifier,
    modelId: String = "Astronaut",
    visemeValue: Int = 0,
    micAmplitude: Float = 0f
) {
    val context = LocalContext.current
    var hasMicPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        )
    }

    val isEmulator = remember(com.example.ui.screens.force3DWebGLOverrideByDeveloper) { isEmulatorDevice() }

    SideEffect {
        android.util.Log.d("ReadyPlayerMeViewer", "Compose render init check: isEmulator=$isEmulator, force3DWebGLOverride=${com.example.ui.screens.force3DWebGLOverrideByDeveloper}")
    }

    var isRenderProcessCrashed by remember(isEmulator) { mutableStateOf(isEmulator) }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasMicPermission = isGranted
        if (!isGranted) {
            Toast.makeText(context, "Microphone permission is required for Live Conversational Mode.", Toast.LENGTH_LONG).show()
        }
    }

    LaunchedEffect(Unit) {
        if (!hasMicPermission) {
            launcher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    if (isRenderProcessCrashed) {
        // Safe 2D Fallback when WebGL renderer runs out of memory or crashes on headless cloud emulators
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = androidx.compose.ui.Alignment.Center
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Live 3D WebGL Fallback Mode",
                    color = PulsarAqua,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Text(
                    text = "WebGL render process crashed or memory limits exceeded. Safely executing in 2D audio syncing.",
                    color = SoftGray,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(modifier = Modifier.size(140.dp)) {
                    AvatarCanvas(
                        baseStyle = "COSMIC_GAMER",
                        primaryColorHex = "#00E5FF",
                        accentColorHex = "#FF2A85",
                        bgColorHex = "#141929",
                        frameStyle = "NEON_RING",
                        accessoryType = "NONE",
                        modifier = Modifier.fillMaxSize(),
                        visemeValue = visemeValue
                    )
                }
            }
        }
    } else {
        val glbUrl = if (modelId.startsWith("http") && !modelId.contains("demo.avaturn.dev") && !modelId.contains("demo.avaturn.me")) {
            modelId
        } else {
            "https://modelviewer.dev/shared-assets/models/Astronaut.glb"
        }

        // Construct HTML content hosting the Avaturn model-viewer model with WebAudio lip syncing
        val htmlContent = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
                <style>
                    body { margin: 0; background-color: #0b1120; overflow: hidden; font-family: sans-serif;}
                    model-viewer { width: 100vw; height: 100vh; }
                    #overlay {
                        position: absolute;
                        bottom: 12px;
                        left: 12px;
                        background: rgba(12, 16, 27, 0.85);
                        border: 1px solid #00E5FF;
                        border-radius: 8px;
                        padding: 8px 12px;
                        color: #fff;
                        font-size: 11px;
                        z-index: 10;
                        pointer-events: none;
                    }
                </style>
                <!-- Load modern Model Viewer components safely -->
                <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.1.1/model-viewer.min.js"></script>
            </head>
            <body>
                <div id="overlay">🎙️ Live Oral Viseme Tracker Calibration: Off</div>
                
                <model-viewer id="avatar" 
                    src="$glbUrl" 
                    camera-controls 
                    disable-zoom
                    interaction-prompt="none"
                    shadow-intensity="1">
                </model-viewer>
                
                <script>
                    const viewer = document.querySelector('model-viewer');
                    let audioCtx = null;
                    let analyser = null;
                    let micStream = null;
                    const overlay = document.getElementById('overlay');
                    
                    // Exponential decay tracking variables for vocal morph interpolation
                    const lastWeights = {
                        viseme_aa: 0.0,
                        viseme_O: 0.0,
                        viseme_E: 0.0,
                        jawOpen: 0.0
                    };
                    
                    // Setup voice mapping & FFT analysis engine
                    async function initWebAudio() {
                        try {
                            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                            audioCtx = new AudioContextClass();
                            analyser = audioCtx.createAnalyser();
                            
                            // Set fftSize=256 as required to balance processing cost and frequency grouping resolution
                            analyser.fftSize = 256;
                            
                            // Access native WebRTC stream from WebView context
                            micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                            const source = audioCtx.createMediaStreamSource(micStream);
                            source.connect(analyser);
                            
                            overlay.innerText = "🎙️ Real-Time Audio Capture: Active";
                            startLipSyncRenderLoop();
                        } catch (e) {
                            console.warn("Microphone access failed. Defaulting to simulation loop.", e);
                            overlay.innerText = "🤖 Live Convo AI Simulator Activated";
                            startSimulatedAudioLoop();
                        }
                    }
                    
                    // Real-time animation synchronization matching frequency categories directly to Oculus Visemes
                    function startLipSyncRenderLoop() {
                        const bufferLength = analyser.frequencyBinCount;
                        const dataArray = new Uint8Array(bufferLength);
                        
                        function run() {
                            requestAnimationFrame(run);
                            analyser.getByteFrequencyData(dataArray);
                            
                            let lowSum = 0;
                            let midSum = 0;
                            let highSum = 0;
                            
                            for (let i = 0; i < 3; i++) lowSum += dataArray[i];
                            for (let i = 3; i < 7; i++) midSum += dataArray[i];
                            for (let i = 7; i < 15; i++) highSum += dataArray[i];
                            
                            const lowNorm = (lowSum / 3) / 255.0;
                            const midNorm = (midSum / 4) / 255.0;
                            const highNorm = (highSum / 8) / 255.0;
                            
                            const targetAa = Math.min(midNorm * 2.8, 1.0);
                            const targetO = Math.min(lowNorm * 2.5, 1.0);
                            const targetE = Math.min(highNorm * 2.5, 1.0);
                            
                            let scaleSum = 0;
                            for (let j = 0; j < bufferLength; j++) {
                                scaleSum += dataArray[j];
                            }
                            const jawTarget = Math.min((scaleSum / bufferLength) / 50.0, 1.0);
                            
                            const alpha = 0.25;
                            lastWeights.viseme_aa = lastWeights.viseme_aa * (1.0 - alpha) + targetAa * alpha;
                            lastWeights.viseme_O = lastWeights.viseme_O * (1.0 - alpha) + targetO * alpha;
                            lastWeights.viseme_E = lastWeights.viseme_E * (1.0 - alpha) + targetE * alpha;
                            lastWeights.jawOpen = lastWeights.jawOpen * (1.0 - alpha) + jawTarget * alpha;
                            
                            applyMorphTargets(lastWeights.viseme_aa, lastWeights.viseme_O, lastWeights.viseme_E, lastWeights.jawOpen);
                        }
                        run();
                    }
                    
                    function startSimulatedAudioLoop() {
                        let time = 0;
                        function runSim() {
                            requestAnimationFrame(runSim);
                            time += 0.08;
                            
                            const speakStrength = Math.abs(Math.sin(time * 0.4) * Math.cos(time * 0.2));
                            const targetAa = Math.abs(Math.sin(time * 1.8)) * speakStrength;
                            const targetO = Math.abs(Math.cos(time * 1.1)) * speakStrength;
                            const targetE = Math.abs(Math.sin(time * 2.4)) * speakStrength;
                            const jawTarget = speakStrength * 0.7;
                            
                            const alpha = 0.22;
                            lastWeights.viseme_aa = lastWeights.viseme_aa * (1.0 - alpha) + targetAa * alpha;
                            lastWeights.viseme_O = lastWeights.viseme_O * (1.0 - alpha) + targetO * alpha;
                            lastWeights.viseme_E = lastWeights.viseme_E * (1.0 - alpha) + targetE * alpha;
                            lastWeights.jawOpen = lastWeights.jawOpen * (1.0 - alpha) + jawTarget * alpha;
                            
                            applyMorphTargets(lastWeights.viseme_aa, lastWeights.viseme_O, lastWeights.viseme_E, lastWeights.jawOpen);
                        }
                        runSim();
                    }
                    
                    function applyMorphTargets(aa, o, e, jaw) {
                        try {
                            const symbol = Symbol.for('3D-model-scene-graph');
                            const scene = viewer[symbol];
                            if (!scene) return;
                            
                            scene.traverse((child) => {
                                if (child.isSkinnedMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
                                    const dict = child.morphTargetDictionary;
                                    
                                    const apply = (name, val) => {
                                        const index = dict[name];
                                        if (index !== undefined) {
                                            child.morphTargetInfluences[index] = Math.max(0.0, Math.min(val, 1.0));
                                        }
                                    };
                                    
                                    apply('viseme_aa', aa);
                                    apply('viseme_O', o);
                                    apply('viseme_E', e);
                                    apply('viseme_U', o * 0.84);
                                    apply('viseme_I', e * 0.9);
                                    apply('jawOpen', jaw);
                                    
                                    apply('eyeBlinkLeft', Math.sin(Date.now() * 0.0018) > 0.96 ? 1.0 : 0.0);
                                    apply('eyeBlinkRight', Math.sin(Date.now() * 0.0018) > 0.96 ? 1.0 : 0.0);
                                }
                            });
                        } catch (err) {
                            // Silently ignore during model load/transition phase
                        }
                    }
                    
                    viewer.addEventListener('load', () => {
                        initWebAudio();
                    });
                    
                    window.addEventListener('click', () => {
                        if (audioCtx && audioCtx.state === 'suspended') {
                            audioCtx.resume();
                        }
                    });
                </script>
            </body>
            </html>
        """.trimIndent()

        AndroidView(
            modifier = modifier.fillMaxSize(),
            factory = { context ->
                try {
                    WebView(context).apply {
                        settings.javaScriptEnabled = true
                        val defaultUa = settings.userAgentString
                        if (!defaultUa.isNullOrEmpty()) {
                            settings.userAgentString = defaultUa
                                .replace("; wv", "")
                                .replace(Regex("Version/\\d+\\.\\d+\\s?"), "")
                        }
                        settings.loadWithOverviewMode = true
                        settings.useWideViewPort = true
                        settings.domStorageEnabled = true
                        settings.mediaPlaybackRequiresUserGesture = false
                        settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        settings.allowContentAccess = true
                        settings.allowFileAccess = true

                        webChromeClient = object : WebChromeClient() {
                            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                                consoleMessage?.let {
                                    val level = it.messageLevel()?.name ?: "LOG"
                                    val logMsg = "JS CONSOLE: [$level] ${it.message()} @ ${it.sourceId()}:${it.lineNumber()}"
                                    android.util.Log.e("ReadyPlayerMeViewer", logMsg)
                                    android.util.Log.d("ReadyPlayerMeViewer", logMsg)
                                }
                                return true
                            }

                            override fun onPermissionRequest(request: PermissionRequest?) {
                                if (request != null) {
                                    android.util.Log.d("ReadyPlayerMeViewer", "onPermissionRequest: granting resources=${request.resources?.joinToString()}")
                                    request.grant(request.resources)
                                }
                            }
                        }

                        webViewClient = object : WebViewClient() {
                            override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
                                val didCrash = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) detail?.didCrash() == true else false
                                android.util.Log.e("ReadyPlayerMeViewer", "onRenderProcessGone triggered. didCrash=$didCrash")
                                isRenderProcessCrashed = true
                                return true
                            }
                        }
                        val uri = try {
                            android.net.Uri.parse(glbUrl)
                        } catch (e: Throwable) {
                            null
                        }
                        val baseUrl = if (uri != null && uri.scheme != null && uri.host != null) {
                            "${uri.scheme}://${uri.host}"
                        } else {
                            "https://modelviewer.dev"
                        }
                        loadDataWithBaseURL(baseUrl, htmlContent, "text/html", "UTF-8", null)
                    }
                } catch (e: Throwable) {
                    android.util.Log.e("ReadyPlayerMeViewer", "Exception caught during WebView instantiation", e)
                    isRenderProcessCrashed = true
                    android.view.View(context)
                }
            },
            update = { view ->
                try {
                    val normalizedWeight = micAmplitude.coerceIn(0.0f, 1.0f)
                    if (view is WebView) {
                        view.evaluateJavascript(
                            "if (window.applyMorphTargets) { window.applyMorphTargets($normalizedWeight, 0, 0, $normalizedWeight); }",
                            null
                        )
                    }
                } catch (e: Throwable) {
                    // Ignore or log error
                }
            }
        )
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ReadyPlayerMeCreator(
    modifier: Modifier = Modifier,
    onAvatarCreated: (String) -> Unit,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        )
    }

    var permissionChecked by remember { mutableStateOf(false) }

    var filePathCallback by remember { mutableStateOf<android.webkit.ValueCallback<Array<android.net.Uri>>?>(null) }

    val fileChooserLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        val results = if (uri != null) arrayOf(uri) else null
        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] ?: false
        val audioGranted = permissions[Manifest.permission.RECORD_AUDIO] ?: false
        hasCameraPermission = cameraGranted && audioGranted
        permissionChecked = true
        if (!cameraGranted) {
            Toast.makeText(context, "Camera permission is required to create an avatar from a selfie.", Toast.LENGTH_LONG).show()
        }
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            launcher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))
        } else {
            permissionChecked = true
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        if (permissionChecked) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    WebView(ctx).apply {
                        settings.javaScriptEnabled = true
                        val defaultUa = settings.userAgentString
                        if (!defaultUa.isNullOrEmpty()) {
                            settings.userAgentString = defaultUa
                                .replace("; wv", "")
                                .replace(Regex("Version/\\d+\\.\\d+\\s?"), "")
                        }
                        settings.domStorageEnabled = true
                        settings.databaseEnabled = true
                        settings.allowFileAccess = true
                        settings.allowContentAccess = true
                        settings.mediaPlaybackRequiresUserGesture = false
                        settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        settings.loadWithOverviewMode = true
                        settings.useWideViewPort = true

                        addJavascriptInterface(object {
                            @android.webkit.JavascriptInterface
                            fun onAvatarExported(url: String) {
                                post {
                                    onAvatarCreated(url)
                                }
                            }

                            @android.webkit.JavascriptInterface
                            fun onPostMessage(messageJson: String) {
                                post {
                                    try {
                                        android.util.Log.d("AvaturnCreator", "Raw postMessage: $messageJson")
                                        val json = org.json.JSONObject(messageJson)
                                        val type = json.optString("type")
                                        val event = json.optString("event")
                                        
                                        if (type == "export" || type == "avatar.exported" || event == "export" || type == "avaturn.export") {
                                            val data = json.optJSONObject("data")
                                            val url = data?.optString("url") ?: json.optString("url")
                                            if (url.isNotEmpty() && url.contains(".glb")) {
                                                android.util.Log.d("AvaturnCreator", "Successfully matched exported avatar URL: $url")
                                                onAvatarCreated(url)
                                            } else {
                                                android.util.Log.w("AvaturnCreator", "Matched export type but URL was empty or invalid (must contain .glb): $url")
                                            }
                                        } else {
                                            // Recursive search for any glb URL
                                            val url = findGlbUrlInJson(json)
                                            if (url != null) {
                                                android.util.Log.d("AvaturnCreator", "Found GLB URL in nested payload: $url")
                                                onAvatarCreated(url)
                                            }
                                        }
                                    } catch (e: Throwable) {
                                        android.util.Log.e("AvaturnCreator", "Failed to parse postMessage json", e)
                                    }
                                }
                            }

                            private fun findGlbUrlInJson(json: org.json.JSONObject): String? {
                                val directUrl = json.optString("url")
                                if (directUrl.contains(".glb")) {
                                    return directUrl
                                }
                                val dataObj = json.optJSONObject("data")
                                if (dataObj != null) {
                                    val dataUrl = dataObj.optString("url")
                                    if (dataUrl.contains(".glb")) {
                                        return dataUrl
                                    }
                                }
                                val payloadObj = json.optJSONObject("payload")
                                if (payloadObj != null) {
                                    val payloadUrl = payloadObj.optString("url")
                                    if (payloadUrl.contains(".glb")) {
                                        return payloadUrl
                                    }
                                }
                                return null
                            }
                        }, "AndroidInterface")

                        webChromeClient = object : WebChromeClient() {
                            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                                consoleMessage?.let {
                                    val level = it.messageLevel()?.name ?: "LOG"
                                    val logMsg = "JS CONSOLE (Creator): [$level] ${it.message()} @ ${it.sourceId()}:${it.lineNumber()}"
                                    android.util.Log.d("AvaturnCreator", logMsg)
                                    android.util.Log.e("AvaturnCreator", logMsg)
                                }
                                return true
                            }

                            override fun onPermissionRequest(request: PermissionRequest?) {
                                if (request != null) {
                                    android.util.Log.d("AvaturnCreator", "onPermissionRequest: granting resources=${request.resources?.joinToString()}")
                                    request.grant(request.resources)
                                }
                            }

                            override fun onShowFileChooser(
                                webView: WebView?,
                                filePathCallbackInternal: android.webkit.ValueCallback<Array<android.net.Uri>>?,
                                fileChooserParams: FileChooserParams?
                            ): Boolean {
                                if (filePathCallback != null) {
                                    filePathCallback?.onReceiveValue(null)
                                }
                                filePathCallback = filePathCallbackInternal
                                
                                val mimeTypes = fileChooserParams?.acceptTypes ?: arrayOf("image/*")
                                val mimeType = if (mimeTypes.isNotEmpty()) mimeTypes[0] else "image/*"
                                
                                try {
                                    fileChooserLauncher.launch(mimeType)
                                } catch (e: Throwable) {
                                    filePathCallback?.onReceiveValue(null)
                                    filePathCallback = null
                                    return false
                                }
                                return true
                            }
                        }

                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                                val url = request?.url?.toString() ?: ""
                                if (url.endsWith(".glb") || (url.contains(".glb") && !url.contains("demo.avaturn.dev") && !url.contains("demo.avaturn.me"))) {
                                    onAvatarCreated(url)
                                    return true
                                }
                                return false
                            }

                            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                                super.onPageStarted(view, url, favicon)
                                if (url != null && (url.endsWith(".glb") || (url.contains(".glb") && !url.contains("demo.avaturn.dev") && !url.contains("demo.avaturn.me")))) {
                                    onAvatarCreated(url)
                                }
                            }

                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                view?.evaluateJavascript(
                                    """
                                        (function() {
                                            window.addEventListener('message', function(event) {
                                                try {
                                                    if (typeof event.data === 'string') {
                                                        AndroidInterface.onPostMessage(event.data);
                                                    } else if (typeof event.data === 'object') {
                                                        AndroidInterface.onPostMessage(JSON.stringify(event.data));
                                                    }
                                                } catch(e) {}
                                            });
                                        })();
                                    """.trimIndent(),
                                    null
                                )
                            }

                            override fun onReceivedError(
                                view: WebView?,
                                request: android.webkit.WebResourceRequest?,
                                error: android.webkit.WebResourceError?
                            ) {
                                super.onReceivedError(view, request, error)
                                val description = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    error?.description?.toString() ?: "Unknown error"
                                } else {
                                    "WebView load error"
                                }
                                val errorUrl = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    request?.url?.toString() ?: ""
                                } else {
                                    ""
                                }
                                android.util.Log.e("AvaturnCreator", "WebView Error: $description for URL: $errorUrl")
                            }
                        }

                        // Load Avaturn URL directly
                        loadUrl("https://demo.avaturn.dev")
                    }
                }
            )
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = androidx.compose.ui.Alignment.Center
            ) {
                androidx.compose.material3.CircularProgressIndicator(color = PulsarAqua)
            }
        }
    }
}
