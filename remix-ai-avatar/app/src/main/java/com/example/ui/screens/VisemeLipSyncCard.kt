package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun VisemeLipSyncCard(
    isLipSyncPlaying: Boolean,
    onLipSyncPlayingChange: (Boolean) -> Unit,
    visemeStudState: Int,
    onVisemeStateChange: (Int) -> Unit,
    micSimulationAmplitude: Float
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, PulsarAqua.copy(alpha = 0.2f)),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("viseme_lipsync_card")
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "8-VISEME LIP-SYNC LAB (STAGE 2 PREVIEW)",
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = PulsarAqua,
                    letterSpacing = 1.sp
                )
            )
            Text(
                text = "The physical mouth elements on the Avatar Portrait above morph dynamically. Tap a phonetic viseme mapping below or play the automated loop to verify 120fps GPU-accelerated lip synchronicity.",
                fontSize = 11.sp,
                color = SoftGray
            )

            // Audio simulation waveform UI
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SpaceSlate, RoundedCornerShape(8.dp))
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = { onLipSyncPlayingChange(!isLipSyncPlaying) },
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = if (isLipSyncPlaying) StarletPink else PulsarAqua
                    ),
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = if (isLipSyncPlaying) Icons.Default.Close else Icons.Default.PlayArrow,
                        contentDescription = "Play viseme stream",
                        tint = if (isLipSyncPlaying) Color.White else Color.Black,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (isLipSyncPlaying) "Simulating Core PCM Decibels (Dynamic Mapping)" else "PCM Audio Mapping Idle",
                        fontSize = 11.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    // Waveform visuals
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val barsCount = 20
                        val random = java.util.Random()
                        for (b in 1..barsCount) {
                            val actHeight = if (isLipSyncPlaying) {
                                // Random scale height based on amplitude
                                (4 + random.nextInt(12) * micSimulationAmplitude).dp
                            } else {
                                2.dp
                            }
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(actHeight)
                                    .background(
                                        if (isLipSyncPlaying) PulsarAqua else SoftGray.copy(alpha = 0.3f),
                                        RoundedCornerShape(1.dp)
                                    )
                            )
                        }
                    }
                }
            }

            Text("Active Viseme Oral State: $visemeStudState", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
            
            // Grid of 8 phoneme selectors
            val visemesList = listOf(
                Triple(0, "Neutral", "Idle stance"),
                Triple(1, "Open A", "Vocalic /a/"),
                Triple(2, "Closed M, B", "Bilabial"),
                Triple(3, "Oval O", "Rounded /o/"),
                Triple(4, "Dental S, T", "Tenth"),
                Triple(5, "Smile E, I", "Widened"),
                Triple(6, "Pucker W", "Tight /u/"),
                Triple(7, "Upper Teeth F", "Labiodental")
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                visemesList.forEach { (index, code, desc) ->
                    FilterChip(
                        selected = visemeStudState == index,
                        onClick = {
                            onLipSyncPlayingChange(false)
                            onVisemeStateChange(index)
                        },
                        label = {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(code, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                Text("v_$index", fontSize = 8.sp, color = if (visemeStudState == index) Color.Black else SoftGray)
                            }
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = PulsarAqua,
                            selectedLabelColor = Color.Black,
                            containerColor = SpaceSlate,
                            labelColor = SoftGray
                        ),
                        border = null
                    )
                }
            }
        }
    }
}
