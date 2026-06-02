package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.viewmodel.AvatarGenerationState
import com.example.viewmodel.ProjectViewModel

@Composable
fun AiGeneratorCard(viewModel: ProjectViewModel) {
    var descTopic by remember { mutableStateOf("") }
    var visualFlavor by remember { mutableStateOf("Tech Guru") }
    val emotionalMood = "Energetic"

    val context = LocalContext.current

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Card(
            colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, StarletPink.copy(alpha = 0.15f))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "AI Avatar Designer",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Input your YouTube niche. Gemini will recommend matching branding schemes, visual traits, and details to configure.",
                    fontSize = 12.sp,
                    color = SoftGray
                )
                Spacer(modifier = Modifier.height(16.dp))

                TextField(
                    value = descTopic,
                    onValueChange = { descTopic = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("avatar_niche_input"),
                    placeholder = { Text("Topic e.g., Sci-Fi Storytelling, Bitcoin Investing", fontSize = 13.sp) },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = SpaceSlate,
                        unfocusedContainerColor = SpaceSlate,
                        focusedIndicatorColor = PulsarAqua,
                        unfocusedIndicatorColor = Color.Transparent,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedPlaceholderColor = SoftGray,
                        unfocusedPlaceholderColor = SoftGray
                    ),
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text("Avatar Visual Core Style preference:", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("Tech Guru", "Cosmic Gamer", "Wealth Mentor", "Zen Coach").forEach { opt ->
                        FilterChip(
                            selected = visualFlavor == opt,
                            onClick = { visualFlavor = opt },
                            label = { Text(opt, fontSize = 11.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = StarletPink,
                                selectedLabelColor = Color.White,
                                containerColor = SpaceSlate,
                                labelColor = SoftGray
                            ),
                            border = null
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = {
                        if (descTopic.isBlank()) {
                            Toast.makeText(context, "Please enter a topic first!", Toast.LENGTH_SHORT).show()
                        } else {
                            viewModel.generateAvatarBranding(descTopic, visualFlavor, emotionalMood)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = StarletPink),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("avatar_generate_btn"),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Generate Branding Strategy", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Loading and Result States of AI Branding Planner
        when (val state = viewModel.avatarState) {
            is AvatarGenerationState.Loading -> {
                Card(
                    colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator(color = StarletPink)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Developing host profile, palettes & Midjourney prompt parameters...", fontSize = 12.sp, color = SoftGray, textAlign = TextAlign.Center)
                    }
                }
            }
            is AvatarGenerationState.Success -> {
                val blocks = state.parsedBlocks
                val name = blocks["AVATAR_NAME"] ?: viewModel.customName
                val themeDesc = blocks["VISUAL_THEME"] ?: ""
                val mjPrompt = blocks["GENERATIVE_AI_PROMPT"] ?: ""
                val brandingStrategy = blocks["CHANNEL_BRANDING"] ?: ""

                Card(
                    colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, PulsarAqua.copy(alpha = 0.2f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Proposed Host Identity", fontWeight = FontWeight.Bold, color = PulsarAqua)
                            IconButton(onClick = { viewModel.resetAvatarState() }) {
                                Icon(Icons.Default.Close, contentDescription = "Clear", tint = SoftGray)
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("NAME Suggestion: $name", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Spacer(modifier = Modifier.height(12.dp))

                        Text("VISUAL THEME DESCRIPTION", fontSize = 11.sp, color = StarletPink, fontWeight = FontWeight.Bold)
                        Text(themeDesc, fontSize = 12.sp, color = SoftGray)
                        Spacer(modifier = Modifier.height(12.dp))

                        Text("STATION BRANDING TIPS", fontSize = 11.sp, color = StarletPink, fontWeight = FontWeight.Bold)
                        Text(brandingStrategy, fontSize = 12.sp, color = SoftGray)
                        Spacer(modifier = Modifier.height(12.dp))

                        Text("MIDJOURNEY / GENERATIVE AI PROMPT (TAP TO COPY)", fontSize = 11.sp, color = PulsarAqua, fontWeight = FontWeight.Bold)
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SpaceSlate),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { copyToClipboard(context, mjPrompt, "Avatar Prompt") }
                        ) {
                            Text(
                                mjPrompt,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 11.sp,
                                color = SoftGray,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }
                }
            }
            is AvatarGenerationState.Error -> {
                Text(state.message, color = Color.Red, fontSize = 12.sp, modifier = Modifier.padding(8.dp))
            }
            else -> {}
        }
    }
}
