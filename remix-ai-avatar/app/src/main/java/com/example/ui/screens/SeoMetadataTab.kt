package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.local.VideoProject
import com.example.viewmodel.ProjectViewModel

// ==========================================
// TAB 4: SEO METADATA & RECRUITING
// ==========================================
@Composable
fun SeoMetadataTab(viewModel: ProjectViewModel) {
    val projects by viewModel.videoProjects.collectAsStateWithLifecycle()
    val context = LocalContext.current

    if (projects.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Icons.Default.List, contentDescription = null, tint = SoftGray, modifier = Modifier.size(50.dp))
                Text("Write and save a project script first to enable instant click SEO optimizations.", color = SoftGray, fontSize = 13.sp, textAlign = TextAlign.Center)
            }
        }
    } else {
        var selectedLocalProject by remember { mutableStateOf<VideoProject?>(null) }

        LaunchedEffect(projects) {
            if (selectedLocalProject == null || !projects.any { it.id == selectedLocalProject?.id }) {
                selectedLocalProject = projects.firstOrNull()
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    text = "SELECT WORKSPACE PROJECT",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = PulsarAqua,
                        letterSpacing = 1.sp
                    )
                )
            }

            // Quick horizontal slider carousel to select active project metadata
            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(projects) { itemProj ->
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (selectedLocalProject?.id == itemProj.id) StarletPink else NebulaDarkCard
                            ),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .width(150.dp)
                                .clickable { selectedLocalProject = itemProj }
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    itemProj.title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = Color.White,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Niche: ${itemProj.niche}", fontSize = 10.sp, color = SoftGray)
                            }
                        }
                    }
                }
            }

            // SEO Metadata Viewer fields
            selectedLocalProject?.let { activeProject ->
                item {
                    Text(
                        text = "SEO PACK: ${activeProject.title}",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                }

                item {
                    SeoCard(
                        titleText = "TITLE DEALS",
                        bodyText = activeProject.title,
                        onCopy = { copyToClipboard(context, activeProject.title, "SEO Title") }
                    )
                }

                item {
                    SeoCard(
                        titleText = "YOUTUBE OPTIMIZED DESCRIPTION",
                        bodyText = activeProject.description.ifBlank { "N/A" },
                        onCopy = { copyToClipboard(context, activeProject.description, "SEO Description") }
                    )
                }

                item {
                    SeoCard(
                        titleText = "TAGS AND SEARCH ARRAYS",
                        bodyText = activeProject.tags.ifBlank { "N/A" },
                        onCopy = { copyToClipboard(context, activeProject.tags, "Search Tags") }
                    )
                }

                item {
                    SeoCard(
                        titleText = "THUMBNAIL IMAGE GENERATOR PROMPT",
                        bodyText = activeProject.thumbnailPrompt.ifBlank { "N/A" },
                        onCopy = { copyToClipboard(context, activeProject.thumbnailPrompt, "Thumbnail Prompt") }
                    )
                }
            }
        }
    }
}

@Composable
fun SeoCard(titleText: String, bodyText: String, onCopy: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.05f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(titleText, fontSize = 11.sp, color = PulsarAqua, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
                IconButton(onClick = onCopy) {
                    Icon(Icons.Default.Share, contentDescription = "Copy", tint = SoftGray, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                bodyText,
                fontSize = 12.sp,
                color = SoftGray,
                lineHeight = 18.sp
            )
        }
    }
}
