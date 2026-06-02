package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.CustomAvatar
import com.example.data.local.VideoProject
import com.example.ui.components.AvatarCanvas

// ==========================================
// TAB 1: DASHBOARD HUB
// ==========================================
@Composable
fun HubTab(projects: List<VideoProject>, avatars: List<CustomAvatar>) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Welcome Header card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, PulsarAqua.copy(alpha = 0.2f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Channel Creator Hub",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Track analytics, coordinate scripts & visual AI anchors in one system.",
                            style = MaterialTheme.typography.bodyMedium.copy(color = SoftGray)
                        )
                    }
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(Brush.radialGradient(colors = listOf(PulsarAqua, StarletPink.copy(alpha = 0.2f)))),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }
        }

        // Stats Analytics Grid
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "CHANNEL AUTOMATION ANALYTICS (GLOBAL)",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = PulsarAqua,
                        letterSpacing = 1.sp
                    ),
                    modifier = Modifier.padding(start = 4.dp)
                )

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.weight(1f)) {
                        StatCard(title = "Subscribers", value = "12,482", icon = Icons.Default.Person, trend = "+24% this mo", trendColor = EmeraldCash)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        StatCard(title = "Total Views", value = "381,902", icon = Icons.Default.Search, trend = "+7.2K today", trendColor = EmeraldCash)
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.weight(1f)) {
                        StatCard(title = "Avg CTR", value = "9.4%", icon = Icons.Default.Info, trend = "Optimized", trendColor = PulsarAqua)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        StatCard(title = "Videos Active", value = "${projects.size}", icon = Icons.Default.PlayArrow, trend = "${projects.count { it.status == "SCHEDULED" }} Queue", trendColor = StarletPink)
                    }
                }
            }
        }

        // Animated Analytics Chart Canvas representation
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Real-time Traffic Growth",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(100.dp)
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val w = size.width
                            val h = size.height
                            // Draw dynamic coordinate lines
                            drawLine(Color.Gray.copy(alpha = 0.2f), Offset(0f, h * 0.75f), Offset(w, h * 0.75f))
                            drawLine(Color.Gray.copy(alpha = 0.2f), Offset(0f, h * 0.5f), Offset(w, h * 0.5f))
                            drawLine(Color.Gray.copy(alpha = 0.2f), Offset(0f, h * 0.25f), Offset(w, h * 0.25f))

                            // Draw simulated vector wave paths representing CTR/Impressions
                            val path = Path().apply {
                                moveTo(0f, h * 0.8f)
                                quadraticTo(w * 0.15f, h * 0.75f, w * 0.3f, h * 0.45f)
                                quadraticTo(w * 0.45f, h * 0.2f, w * 0.6f, h * 0.5f)
                                quadraticTo(w * 0.75f, h * 0.75f, w * 0.9f, h * 0.25f)
                                lineTo(w, h * 0.1f)
                            }
                            drawPath(
                                path = path,
                                color = PulsarAqua,
                                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
                            )

                            // Add linear shading gradient underneath
                            val shadowPath = Path().apply {
                                addPath(path)
                                lineTo(w, h)
                                lineTo(0f, h)
                                close()
                            }
                            drawPath(
                                path = shadowPath,
                                brush = Brush.verticalGradient(
                                    colors = listOf(PulsarAqua.copy(alpha = 0.25f), Color.Transparent)
                                )
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Mon", fontSize = 10.sp, color = SoftGray)
                        Text("Wed", fontSize = 10.sp, color = SoftGray)
                        Text("Fri", fontSize = 10.sp, color = SoftGray)
                        Text("Now (Peak)", fontSize = 10.sp, color = PulsarAqua, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Active Avatars Preview Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Generated AI Hosts (${avatars.size})",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    if (avatars.isEmpty()) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 12.dp)
                        ) {
                            Icon(Icons.Default.Face, contentDescription = null, tint = SoftGray, modifier = Modifier.size(28.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                "No Custom AI Hosts created yet. Tap the Face icon below to design your host!",
                                fontSize = 12.sp,
                                color = SoftGray
                            )
                        }
                    } else {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            items(avatars) { avatar ->
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(
                                        modifier = Modifier
                                            .size(56.dp)
                                            .clip(CircleShape)
                                            .background(NebulaDarkCard)
                                    ) {
                                        AvatarCanvas(
                                            baseStyle = avatar.baseStyle,
                                            primaryColorHex = avatar.primaryColor,
                                            accentColorHex = avatar.accentColor,
                                            bgColorHex = avatar.bgColor,
                                            frameStyle = avatar.frameStyle,
                                            accessoryType = avatar.accessory,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        avatar.name,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.width(64.dp),
                                        textAlign = TextAlign.Center
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Steps instructions step-by-step
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "HOW TO AUTOMATE YOUR CHANNEL",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = StarletPink,
                        letterSpacing = 1.sp
                    ),
                    modifier = Modifier.padding(start = 4.dp)
                )

                val steps = listOf(
                    "Select theme and design a custom AI Avatar as your profile anchor inside the Avatar Lab Tab.",
                    "Input video topic and leverage Gemini to write detailed multi-stage automated scripts.",
                    "Copy SEO titles & tag blocks instantly to boost YouTube algorithm visibility.",
                    "Schedule written ideas into the video agenda queue database of the Planner tab."
                )

                steps.forEachIndexed { index, desc ->
                    Row(verticalAlignment = Alignment.Top, modifier = Modifier.padding(vertical = 4.dp)) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(PulsarAqua.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("${index + 1}", color = PulsarAqua, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(desc, fontSize = 12.sp, color = SoftGray)
                    }
                }
            }
        }
    }
}

@Composable
fun StatCard(title: String, value: String, icon: ImageVector, trend: String, trendColor: Color) {
    Card(
        colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.05f))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontSize = 11.sp, color = SoftGray, fontWeight = FontWeight.Medium)
                Icon(icon, contentDescription = null, tint = SoftGray, modifier = Modifier.size(16.dp))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(value, fontSize = 22.sp, color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(trend, fontSize = 10.sp, color = trendColor, fontWeight = FontWeight.Bold)
        }
    }
}
