package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.local.CustomAvatar
import com.example.ui.components.AvatarCanvas
import com.example.ui.components.AvaturnCreator
import com.example.ui.components.AvaturnViewer
import com.example.ui.components.parseHexColor
import com.example.viewmodel.ProjectViewModel
import kotlinx.coroutines.delay

// ==========================================
// TAB 2: AVATAR LAB
// ==========================================
@Composable
fun AvatarLabTab(viewModel: ProjectViewModel, avatars: List<CustomAvatar>) {
    var visemeStudState by remember { mutableStateOf(0) }
    var isLipSyncPlaying by remember { mutableStateOf(false) }
    var micSimulationAmplitude by remember { mutableStateOf(0f) }
    var is3DActive by remember { mutableStateOf(false) }
    var isShowAvaturnEditor by remember { mutableStateOf(false) }

    // Multi-viseme automatic phonetic mouth sound morph scheduler (120fps simulation)
    LaunchedEffect(isLipSyncPlaying) {
        if (isLipSyncPlaying) {
            val random = java.util.Random()
            while (isLipSyncPlaying) {
                delay(120)
                // Cycle phonetic mouths: 0: Neutral, 1: A, 2: M, 3: O, 4: T, 5: E, 6: W, 7: F
                visemeStudState = random.nextInt(8)
                micSimulationAmplitude = 0.2f + random.nextFloat() * 0.8f
            }
        } else {
            visemeStudState = 0
            micSimulationAmplitude = 0f
        }
    }

    val context = LocalContext.current

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
        // AI Generator Header Card (modularized component)
        item {
            AiGeneratorCard(viewModel = viewModel)
        }

        // Physical Avatar Customize Builder UI
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "INTERACTIVE VECTOR HOST BUILDER",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = PulsarAqua,
                        letterSpacing = 1.sp
                    ),
                    modifier = Modifier.padding(start = 4.dp)
                )

                // Layout with Canvas Side-by-side with basic details
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .size(140.dp)
                            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                    ) {
                        Box(modifier = Modifier.fillMaxSize()) {
                            if (is3DActive) {
                                AvaturnViewer(
                                    modelId = viewModel.readyPlayerMeModelId,
                                    visemeValue = visemeStudState,
                                    micAmplitude = micSimulationAmplitude,
                                    modifier = Modifier.fillMaxSize()
                                )

                                // Edit 3D Avatar Badge
                                Card(
                                    onClick = { isShowAvaturnEditor = true },
                                    colors = CardDefaults.cardColors(containerColor = StarletPink),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier
                                        .padding(8.dp)
                                        .align(Alignment.BottomStart)
                                        .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                                ) {
                                    Text(
                                        text = "EDIT 3D",
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                                    )
                                }
                            } else {
                                AvatarCanvas(
                                    baseStyle = viewModel.baseStyle,
                                    primaryColorHex = viewModel.primaryColorHex,
                                    accentColorHex = viewModel.accentColorHex,
                                    bgColorHex = viewModel.bgColorHex,
                                    frameStyle = viewModel.frameStyle,
                                    accessoryType = viewModel.accessoryType,
                                    modifier = Modifier.fillMaxSize(),
                                    visemeValue = visemeStudState
                                )
                            }

                            // 2D/3D Selector Toggle Badge
                            Card(
                                onClick = {
                                    is3DActive = !is3DActive
                                },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (is3DActive) StarletPink else NebulaDarkCard
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .padding(8.dp)
                                    .align(Alignment.BottomEnd)
                                    .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                            ) {
                                Text(
                                    text = if (is3DActive) "3D ACTIVE" else "2D ACTIVE",
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Host Hostname Name:", fontSize = 11.sp, color = SoftGray)
                        TextField(
                            value = viewModel.customName,
                            onValueChange = {
                                viewModel.customName = it
                                viewModel.updateAiPromptBasedOnState()
                            },
                            singleLine = true,
                            textStyle = LocalTextStyle.current.copy(fontSize = 13.sp),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = NebulaDarkCard,
                                unfocusedContainerColor = NebulaDarkCard,
                                focusedIndicatorColor = PulsarAqua,
                                unfocusedIndicatorColor = Color.Transparent,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(8.dp)
                        )

                        Text("Frame Boundary shape:", fontSize = 11.sp, color = SoftGray)
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            listOf("NEON_RING", "HEXAGON", "CIRCULAR", "SHARP_BOX").forEach { shape ->
                                FilterChip(
                                    selected = viewModel.frameStyle == shape,
                                    onClick = {
                                        viewModel.frameStyle = shape
                                        viewModel.updateAiPromptBasedOnState()
                                    },
                                    label = { Text(shape.replace("_", " "), fontSize = 9.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = PulsarAqua,
                                        selectedLabelColor = Color.Black,
                                        containerColor = NebulaDarkCard,
                                        labelColor = SoftGray
                                    ),
                                    border = null
                                )
                            }
                        }
                    }
                }
            }
        }

        // Color and Accessory Editors
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.05f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Avatar Accessory Options:", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("NONE", "GLASSES", "HEADPHONES", "MICROPHONE", "HALO").forEach { itemAcc ->
                            FilterChip(
                                selected = viewModel.accessoryType == itemAcc,
                                onClick = {
                                    viewModel.accessoryType = itemAcc
                                    viewModel.updateAiPromptBasedOnState()
                                },
                                label = { Text(itemAcc, fontSize = 10.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = StarletPink,
                                    selectedLabelColor = Color.White,
                                    containerColor = SpaceSlate,
                                    labelColor = SoftGray
                                ),
                                border = null,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Digital Paint Palettes:", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    // Primary accent colors and background selector Row
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Primary Color (Bright Theme)", fontSize = 10.sp, color = SoftGray)
                            // A quick grid of color selections
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                                listOf("#00E5FF", "#FF3D00", "#FFD700", "#FF00FF", "#00E676").forEach { colHex ->
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(parseHexColor(colHex))
                                            .border(
                                                width = if (viewModel.primaryColorHex == colHex) 2.dp else 0.dp,
                                                color = Color.White,
                                                shape = CircleShape
                                            )
                                            .clickable {
                                                viewModel.primaryColorHex = colHex
                                                viewModel.updateAiPromptBasedOnState()
                                            }
                                    )
                                }
                            }
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text("Secondary Highlight Color", fontSize = 10.sp, color = SoftGray)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                                listOf("#FF5722", "#00E5FF", "#B2FF59", "#EA80FC", "#212121").forEach { colHex ->
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(parseHexColor(colHex))
                                            .border(
                                                width = if (viewModel.accentColorHex == colHex) 2.dp else 0.dp,
                                                color = Color.White,
                                                shape = CircleShape
                                            )
                                            .clickable {
                                                viewModel.accentColorHex = colHex
                                                viewModel.updateAiPromptBasedOnState()
                                            }
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = {
                            viewModel.saveCustomAvatar()
                            Toast.makeText(context, "Successfully saved custom host!", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = PulsarAqua),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("avatar_save_preset"),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Color.Black)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Save Host Visual Preset", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 8-Viseme Lip-Sync Studio Preview Card (modularized component)
        item {
            VisemeLipSyncCard(
                isLipSyncPlaying = isLipSyncPlaying,
                onLipSyncPlayingChange = { isLipSyncPlaying = it },
                visemeStudState = visemeStudState,
                onVisemeStateChange = { visemeStudState = it },
                micSimulationAmplitude = micSimulationAmplitude
            )
        }

        // Stored Host Gallery with items deleted
        if (avatars.isNotEmpty()) {
            item {
                Text(
                    text = "SAVED HOST GALLERY",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = PulsarAqua,
                        letterSpacing = 1.sp
                    )
                )
            }

            items(avatars) { itemAvatar ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.05f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(50.dp)
                                .clip(CircleShape)
                                .background(SpaceSlate)
                        ) {
                            AvatarCanvas(
                                baseStyle = itemAvatar.baseStyle,
                                primaryColorHex = itemAvatar.primaryColor,
                                accentColorHex = itemAvatar.accentColor,
                                bgColorHex = itemAvatar.bgColor,
                                frameStyle = itemAvatar.frameStyle,
                                accessoryType = itemAvatar.accessory,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(itemAvatar.name, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                            Text("Style: ${itemAvatar.baseStyle.replace("_", " ")}, Frame: ${itemAvatar.frameStyle}", fontSize = 11.sp, color = SoftGray)
                        }
                        IconButton(onClick = { viewModel.deleteCustomAvatar(itemAvatar.id) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.Red.copy(alpha = 0.8f))
                        }
                    }
                }
            }
        }
    }

    if (isShowAvaturnEditor) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Avaturn 3D Creator",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 16.sp
                    )
                    IconButton(onClick = { isShowAvaturnEditor = false }) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                    }
                }
                
                AvaturnCreator(
                    modifier = Modifier.weight(1f),
                    onAvatarCreated = { avatarUrl ->
                        viewModel.saveRpmModelId(avatarUrl)
                        isShowAvaturnEditor = false
                        Toast.makeText(context, "3D Avatar updated successfully!", Toast.LENGTH_SHORT).show()
                    },
                    onClose = { isShowAvaturnEditor = false }
                )
            }
        }
    }
    }
}
