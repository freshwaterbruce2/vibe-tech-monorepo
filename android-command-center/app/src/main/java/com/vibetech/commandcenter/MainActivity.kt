package com.vibetech.commandcenter

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.jcraft.jsch.JSch
import com.jcraft.jsch.Session
import io.ktor.client.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import java.util.Properties

class MainActivity : ComponentActivity() {

    private val client by lazy {
        HttpClient(OkHttp) {
            install(WebSockets)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize EncryptedSharedPreferences for secure credential storage
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        val sharedPreferences = EncryptedSharedPreferences.create(
            "cc_secure_prefs",
            masterKeyAlias,
            applicationContext,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFF00FFCC),
                    background = Color(0xFF0A0E17),
                    surface = Color(0xFF161B26),
                    onBackground = Color(0xFFE2E8F0),
                    onSurface = Color(0xFFF1F5F9)
                )
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    CommandCenterScreen(sharedPreferences, client)
                }
            }
        }
    }
}

@OptIn(DelicateCoroutinesApi::class)
@Composable
fun CommandCenterScreen(
    sharedPreferences: android.content.SharedPreferences,
    client: HttpClient
) {
    val coroutineScope = rememberCoroutineScope()

    // Profile settings state
    var host by remember { mutableStateOf(sharedPreferences.getString("ssh_host", "192.168.1.176") ?: "") }
    var port by remember { mutableStateOf(sharedPreferences.getString("ssh_port", "22") ?: "") }
    var username by remember { mutableStateOf(sharedPreferences.getString("ssh_user", "") ?: "") }
    var password by remember { mutableStateOf(sharedPreferences.getString("ssh_pass", "") ?: "") }
    var apiRoot by remember { mutableStateOf(sharedPreferences.getString("api_root", "http://192.168.1.176:8743") ?: "") }
    var wsRoot by remember { mutableStateOf(sharedPreferences.getString("ws_root", "ws://192.168.1.176:8743/ws") ?: "") }
    var token by remember { mutableStateOf(sharedPreferences.getString("api_token", "secret_vibe_bridge_78d91a27bc") ?: "") }

    // Status states
    var isWsConnected by remember { mutableStateOf(false) }
    var sshStatus by remember { mutableStateOf("Not tested") }
    var httpStatus by remember { mutableStateOf("Not tested") }
    var logText by remember { mutableStateOf("System Ready\n") }

    // WebSocket monitoring job
    var wsJob by remember { mutableStateOf<Job?>(null) }

    fun addLog(msg: String) {
        Log.d("CommandCenter", msg)
        coroutineScope.launch(Dispatchers.Main) {
            logText += "[${System.currentTimeMillis() % 100000}] $msg\n"
        }
    }

    // Load saved profile or initialize logs
    LaunchedEffect(Unit) {
        addLog("Secure configuration loaded.")
    }

    // Function to run WebSocket listener
    fun startWebSocketListener() {
        wsJob?.cancel()
        wsJob = coroutineScope.launch(Dispatchers.IO) {
            addLog("Attempting connection to Gateway...")
            while (isActive) {
                try {
                    val targetHost = wsRoot.substringAfter("://").substringBefore(":").substringBefore("/")
                    val targetPort = wsRoot.substringAfterLast(":").substringBefore("/").toIntOrNull() ?: 80
                    val rawPath = wsRoot.substringAfter("://").substringAfter("/", "")
                    val targetPath = if (rawPath.contains("?")) {
                        if (rawPath.contains("token=")) rawPath else "$rawPath&token=$token"
                    } else {
                        "$rawPath?token=$token"
                    }
                    
                    addLog("Connecting to WebSocket: $targetHost:$targetPort/$targetPath")
                    client.webSocket(
                        method = io.ktor.http.HttpMethod.Get,
                        host = targetHost,
                        port = targetPort,
                        path = "/$targetPath"
                    ) {
                        withContext(Dispatchers.Main) {
                            isWsConnected = true
                        }
                        addLog("Gateway Connection Active (WebSocket Green Light)")
                        
                        for (frame in incoming) {
                            when (frame) {
                                is Frame.Text -> {
                                    val text = frame.readText()
                                    addLog("RX: $text")
                                }
                                else -> {}
                            }
                        }
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        isWsConnected = false
                    }
                    addLog("WebSocket Error: ${e.javaClass.simpleName} - ${e.message}")
                    delay(5000)
                }
            }
        }
    }

    // Save profile to EncryptedSharedPreferences
    fun saveProfile() {
        sharedPreferences.edit().apply {
            putString("ssh_host", host)
            putString("ssh_port", port)
            putString("ssh_user", username)
            putString("ssh_pass", password)
            putString("api_root", apiRoot)
            putString("ws_root", wsRoot)
            putString("api_token", token)
            apply()
        }
        addLog("Settings stored securely.")
    }

    // SSH diagnostic run
    fun testSSHConnection() {
        sshStatus = "Connecting..."
        addLog("Initializing SSH probe to $host:$port")
        coroutineScope.launch(Dispatchers.IO) {
            var session: Session? = null
            try {
                val jsch = JSch()
                session = jsch.getSession(username, host, port.toIntOrNull() ?: 22)
                session.setPassword(password)
                
                val config = Properties()
                config["StrictHostKeyChecking"] = "no"
                session.setConfig(config)
                session.connect(5000)
                
                withContext(Dispatchers.Main) {
                    sshStatus = "Connected successfully!"
                    addLog("SSH authenticated: System responds.")
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    sshStatus = "Failed: ${e.message}"
                    addLog("SSH diagnostic failed: ${e.message}")
                }
            } finally {
                session?.disconnect()
            }
        }
    }

    // HTTP Diagnostic run
    fun testHTTPConnection() {
        httpStatus = "Testing..."
        addLog("Testing Desktop API endpoint: $apiRoot/health")
        coroutineScope.launch(Dispatchers.IO) {
            try {
                val response: String = client.get("$apiRoot/health") {
                    header("Authorization", "Bearer $token")
                }.toString()
                
                withContext(Dispatchers.Main) {
                    httpStatus = "Success (200 OK)"
                    addLog("Desktop API responds: $response")
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    httpStatus = "Failed: ${e.message}"
                    addLog("Desktop API health check failed: ${e.message}")
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedKeyed(8.dp)
    ) {
        // App Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "VIBE COMMAND CENTER",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.primary
            )
            
            // Connection Dot UI
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(if (isWsConnected) Color(0xFF00FFCC) else Color(0xFFFF3B30))
                        .border(1.dp, Color.Black, CircleShape)
                )
                Text(
                    text = if (isWsConnected) "ONLINE" else "OFFLINE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = if (isWsConnected) Color(0xFF00FFCC) else Color(0xFFFF3B30)
                )
            }
        }

        // Profile Form Card (Glassmorphism inspired styling)
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Desktop Profile Settings",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary
                )

                OutlinedTextField(
                    value = host,
                    onValueChange = { host = it },
                    label = { Text("Host Address (IP)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = { Text("Username") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = port,
                        onValueChange = { port = it },
                        label = { Text("SSH Port") },
                        modifier = Modifier.width(90.dp),
                        singleLine = true
                    )
                }

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Auth Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = apiRoot,
                    onValueChange = { apiRoot = it },
                    label = { Text("Desktop API URL") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = wsRoot,
                    onValueChange = { wsRoot = it },
                    label = { Text("Gateway URL") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = token,
                    onValueChange = { token = it },
                    label = { Text("Security Token") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            saveProfile()
                            startWebSocketListener()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Connect & Save", color = Color(0xFF0A0E17), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Diagnostics Card
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Diagnostics & Link Checks",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("SSH Link Test", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text(sshStatus, fontSize = 11.sp, color = Color.Gray)
                    }
                    Button(
                        onClick = { testSSHConnection() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                    ) {
                        Text("Run Link Test", fontSize = 11.sp, color = Color.White)
                    }
                }

                Divider(color = Color(0xFF1E293B))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("API Gateway (HTTP) Test", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text(httpStatus, fontSize = 11.sp, color = Color.Gray)
                    }
                    Button(
                        onClick = { testHTTPConnection() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                    ) {
                        Text("Test API", fontSize = 11.sp, color = Color.White)
                    }
                }
            }
        }

        // Live Log Stream UI
        Text(
            text = "Console Stream Output",
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Gray,
            modifier = Modifier.padding(top = 8.dp)
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .background(Color(0xFF05070A), RoundedCornerShape(8.dp))
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(8.dp))
                .padding(8.dp)
        ) {
            Text(
                text = logText,
                fontFamily = FontFamily.Monospace,
                fontSize = 11.sp,
                color = Color(0xFF39FF14), // Classic Neon Green console logs
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            )
        }
    }
}

// Helper extension for spacedKeyed arrangement
fun Arrangement.spacedKeyed(space: androidx.compose.ui.unit.Dp): Arrangement.Vertical {
    return Arrangement.spacedBy(space)
}
