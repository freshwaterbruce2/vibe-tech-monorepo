package com.example.ui.screens

import android.os.Build
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.viewmodel.ProjectViewModel

// System theme coloring definitions
val SpaceSlate = Color(0xFF0C101B)
val NebulaDarkCard = Color(0xFF141929)
val PulsarAqua = Color(0xFF00E5FF)
val StarletPink = Color(0xFFFF2A85)
val EmeraldCash = Color(0xFF00E676)
val SoftGray = Color(0xFF90A4AE)

// Global helper for Clipboard copies
fun copyToClipboard(context: Context, text: String, label: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText(label, text)
    clipboard.setPrimaryClip(clip)
    Toast.makeText(context, "Copied $label to clipboard!", Toast.LENGTH_SHORT).show()
}

var force3DWebGLOverrideByDeveloper by mutableStateOf(false)

// Highly robust helper to detect virtualized / cloud emulators and prevent WebGL WebView crashes
fun isEmulatorDevice(): Boolean {
    if (force3DWebGLOverrideByDeveloper) return false
    val fingerprint = Build.FINGERPRINT?.lowercase() ?: ""
    val model = Build.MODEL?.lowercase() ?: ""
    val brand = Build.BRAND?.lowercase() ?: ""
    val device = Build.DEVICE?.lowercase() ?: ""
    val hardware = Build.HARDWARE?.lowercase() ?: ""
    val product = Build.PRODUCT?.lowercase() ?: ""
    val manufacturer = Build.MANUFACTURER?.lowercase() ?: ""
    val board = Build.BOARD?.lowercase() ?: ""

    val result = fingerprint.startsWith("generic") ||
            fingerprint.startsWith("unknown") ||
            fingerprint.contains("emulator") ||
            fingerprint.contains("cuttlefish") ||
            fingerprint.contains("google_sdk") ||
            model.contains("google_sdk") ||
            model.contains("emulator") ||
            model.contains("android sdk") ||
            model.contains("cuttlefish") ||
            model.contains("sdk_gphone") ||
            model.contains("virtual") ||
            device.contains("generic") ||
            device.contains("cf") || device.contains("cuttlefish") ||
            device.contains("emulator") ||
            device.contains("virtual") ||
            brand.startsWith("generic") ||
            brand.contains("google_sdk") ||
            brand.contains("emulator") ||
            hardware.contains("goldfish") ||
            hardware.contains("ranchu") ||
            hardware.contains("cutf") ||
            hardware.contains("gce") ||
            hardware.contains("pivm") ||
            hardware.contains("vbox86") ||
            hardware.contains("virtual") ||
            product.contains("sdk") ||
            product.contains("sdk_x86") ||
            product.contains("sdk_google") ||
            product.contains("google_sdk") ||
            product.contains("emulator") ||
            product.contains("simulator") ||
            product.contains("cf_") ||
            product.contains("cuttlefish") ||
            product.contains("vbox") ||
            product.contains("gce") ||
            manufacturer.contains("genymotion") ||
            manufacturer.contains("virtual") ||
            board.contains("cuttlefish") ||
            board.contains("gce") ||
            board.contains("virtual") ||
            (brand.contains("google") && (model.contains("sdk") || model.contains("emulator") || hardware.contains("ranchu") || hardware.contains("goldfish") || hardware.contains("cutf") || device.contains("emulator") || device.contains("generic") || product.contains("sdk"))) ||
            (Build.SUPPORTED_ABIS != null && Build.SUPPORTED_ABIS.any { it?.lowercase()?.contains("x86") == true || it?.lowercase()?.contains("i386") == true })
            
    android.util.Log.d("EmulatorCheck", "fingerprint=$fingerprint model=$model brand=$brand device=$device hardware=$hardware product=$product manufacturer=$manufacturer board=$board result=$result")
    return result
}

data class StoryScene(
    val sceneId: Int,
    var narration: String,
    val keywords: String,
    val thumbnailUrl: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainDashboardScreen(
    viewModel: ProjectViewModel,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableStateOf(0) }
    val context = LocalContext.current

    val projects by viewModel.videoProjects.collectAsStateWithLifecycle()
    val avatars by viewModel.customAvatars.collectAsStateWithLifecycle()

    Scaffold(
        modifier = modifier
            .fillMaxSize()
            .background(SpaceSlate),
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            tint = PulsarAqua,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "AI AVATAR & YT AUTOMATOR",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = Color.White
                            )
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = SpaceSlate,
                    titleContentColor = Color.White
                ),
                actions = {
                    IconButton(onClick = {
                        val secWarning = "Security Warning: Keep your Gemini API keys in the AI Studio Secrets panel secure. Android APKs are de-compilable."
                        Toast.makeText(context, secWarning, Toast.LENGTH_LONG).show()
                    }) {
                        Icon(Icons.Default.Info, contentDescription = "Security Alert", tint = PulsarAqua)
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = NebulaDarkCard,
                tonalElevation = 8.dp,
                modifier = Modifier.navigationBarsPadding()
            ) {
                val items = listOf(
                    Triple("Hub", Icons.Default.Home, 0),
                    Triple("Avatar Lab", Icons.Default.Face, 1),
                    Triple("Scriptwriter", Icons.Default.Edit, 2),
                    Triple("SEO Tool", Icons.Default.Search, 3),
                    Triple("Planner", Icons.Default.Settings, 4)
                )

                items.forEach { (label, icon, index) ->
                    NavigationBarItem(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label, fontSize = 10.sp, fontWeight = FontWeight.Medium) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = PulsarAqua,
                            unselectedIconColor = SoftGray,
                            selectedTextColor = PulsarAqua,
                            unselectedTextColor = SoftGray,
                            indicatorColor = PulsarAqua.copy(alpha = 0.15f)
                        ),
                        modifier = Modifier.testTag("nav_tab_$index")
                    )
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(SpaceSlate)
        ) {
            // Tab content rendering with slide animation
            AnimatedContent(
                targetState = selectedTab,
                transitionSpec = {
                    fadeIn() + slideInHorizontally { width -> if (targetState > initialState) width else -width } togetherWith
                            fadeOut() + slideOutHorizontally { width -> if (targetState > initialState) -width else width }
                },
                label = "TabContent"
            ) { tabIndex ->
                when (tabIndex) {
                    0 -> HubTab(projects, avatars)
                    1 -> AvatarLabTab(viewModel, avatars)
                    2 -> ScriptwriterTab(viewModel)
                    3 -> SeoMetadataTab(viewModel)
                    4 -> PlannerTab(viewModel, projects)
                }
            }
        }
    }
}
