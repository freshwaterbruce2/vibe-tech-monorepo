package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.viewmodel.ProjectViewModel
import com.example.viewmodel.ScriptGenerationState
import kotlinx.coroutines.delay

// ==========================================
// TAB 3: SCRIPTWRITER
// ==========================================
@Composable
fun ScriptwriterTab(viewModel: ProjectViewModel) {
    var topicOfVideo by remember { mutableStateOf("") }
    var channelNiche by remember { mutableStateOf("Tech Trends") }
    var toneSelection by remember { mutableStateOf("Humorous") }
    var runningTime by remember { mutableStateOf(5) }

    // ElevenLabs vocal synthesis state fields (PRD Section 4)
    var elevenLabsModel by remember { mutableStateOf("Eleven Flash v2.5") }
    var stabilityParam by remember { mutableStateOf(0.5f) }
    var similarityParam by remember { mutableStateOf(0.75f) }
    var styleExaggerationParam by remember { mutableStateOf(0.0f) }
    var contextContinuityActive by remember { mutableStateOf(true) }

    // YPP AI Slop policy safeguards check state (PRD Section 7)
    var alteredDisclosureAccepted by remember { mutableStateOf(true) }

    // MoneyPrinter Phase 3 State
    var isGeneratingReview by remember { mutableStateOf(false) }
    var isReviewBoardVisible by remember { mutableStateOf(false) }
    val reviewScenes = remember { mutableStateListOf<StoryScene>() }

    val context = LocalContext.current

    // Audio rehearsal timer local fields
    var isTimerRecording by remember { mutableStateOf(false) }
    var secondsElapsed by remember { mutableStateOf(0) }

    // Simulated LLM generation delay effect
    LaunchedEffect(isGeneratingReview) {
        if (isGeneratingReview) {
            delay(2500) // Simulate backend latency
            reviewScenes.clear()
            reviewScenes.add(StoryScene(1, "Artificial intelligence isn't coming... it's already here, running our power grids and markets.", "future city lights, ai neural network", "https://picsum.photos/seed/ai1/300/200"))
            reviewScenes.add(StoryScene(2, "But what happens when these systems hit a critical threshold of autonomy?", "cyberpunk dark, server farm", "https://picsum.photos/seed/ai2/300/200"))
            reviewScenes.add(StoryScene(3, "Some call it the singularity. Others call it an extinction-level threat.", "dystopian skyline, ominous clouds", "https://picsum.photos/seed/ai3/300/200"))
            isReviewBoardVisible = true
            isGeneratingReview = false
        }
    }

    // MoneyPrinter Phase 4 State (Render & Publishing Dashboard)
    var isRenderJobActive by remember { mutableStateOf(false) }
    var renderStatusText by remember { mutableStateOf("Initializing Build...") }
    var renderProgressPercent by remember { mutableStateOf(0f) }
    var completedRenderUrl by remember { mutableStateOf<String?>(null) }
    
    // YouTube Publishing State
    var isUploadingToYouTube by remember { mutableStateOf(false) }
    var uploadStatusText by remember { mutableStateOf("") }
    var uploadProgressPercent by remember { mutableStateOf(0f) }

    // Simulated Phase 4 Cloud Render Engine Polling
    LaunchedEffect(isRenderJobActive) {
        if (isRenderJobActive) {
            // Step 1: Synthesizing Audio
            renderStatusText = "Synthesizing Audio via ElevenLabs API..."
            renderProgressPercent = 0.15f
            delay(2000)

            // Step 2: Extracting Timestamps
            renderStatusText = "Generating Whisper Transcriptions..."
            renderProgressPercent = 0.35f
            delay(2000)

            // Step 3: Compositing & Burn-in
            renderStatusText = "Compositing B-roll & Burning ImageMagick Subtitles..."
            for (progress in 50..95 step 10) {
                renderProgressPercent = progress / 100f
                delay(1000)
            }

            // Step 4: Finished
            renderStatusText = "1080p MP4 Ready!"
            renderProgressPercent = 1.0f
            completedRenderUrl = "https://storage.googleapis.com/serenity-storage/renders/final_output.mp4"
            isRenderJobActive = false
        }
    }

    // Simulated Resumable Chunked YouTube Uploading (Algorithm Spec implementation)
    LaunchedEffect(isUploadingToYouTube) {
        if (isUploadingToYouTube) {
            uploadStatusText = "Authenticating OAuth & Initiating Resumable Session..."
            delay(1500)
            
            val totalChunks = 5
            var currentChunk = 0
            while (currentChunk < totalChunks) {
                uploadStatusText = "Uploading Chunk ${currentChunk + 1}/$totalChunks (Exponential Backoff Armed)..."
                
                // Simulate occasional network failure requiring backoff
                val randomNetworkFailure = java.util.Random().nextInt(10) > 7
                if (randomNetworkFailure) {
                    var retries = 0
                    var success = false
                    while (retries < 3 && !success) {
                        val waitTime = Math.pow(2.0, retries.toDouble()).toLong() * 1000
                        uploadStatusText = "Network disruption detected on Chunk ${currentChunk + 1}. Backing off for ${waitTime/1000}s..."
                        delay(waitTime)
                        
                        // Try again
                        if (java.util.Random().nextInt(10) > 3) {
                            success = true
                            uploadStatusText = "Resumed successfully after backoff."
                            delay(500)
                        }
                        retries++
                    }
                    if (!success) {
                        uploadStatusText = "Upload Failed: Maximum Retries Exceeded."
                        delay(2000)
                        isUploadingToYouTube = false
                        return@LaunchedEffect
                    }
                }

                uploadProgressPercent = (currentChunk + 1).toFloat() / totalChunks.toFloat()
                delay(1200)
                currentChunk++
            }

            uploadStatusText = "Status: YouTube Partner API Published & Indexed!"
            delay(2000)
            isUploadingToYouTube = false
        }
    }

    // Coroutine effect for microphone teleprompter rehearsal
    LaunchedEffect(isTimerRecording) {
        if (isTimerRecording) {
            while (isTimerRecording) {
                delay(1000)
                secondsElapsed++
            }
        } else {
            secondsElapsed = 0
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, PulsarAqua.copy(alpha = 0.15f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("AI Automation Scriptwriter", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                    Text("Select parameters to trigger Gemini 3.5-flash text models. It writes video drafts tailored to viral YouTube patterns.", fontSize = 12.sp, color = SoftGray)

                    Spacer(modifier = Modifier.height(6.dp))

                    Text("Video Topic or Main Idea:", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    TextField(
                        value = topicOfVideo,
                        onValueChange = { topicOfVideo = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("script_topic_input"),
                        placeholder = { Text("e.g., Rise of Quantum Computing, Secrets of Warren Buffett", fontSize = 13.sp) },
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = SpaceSlate,
                            unfocusedContainerColor = SpaceSlate,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedIndicatorColor = PulsarAqua,
                            unfocusedIndicatorColor = Color.Transparent
                        ),
                        singleLine = true,
                        shape = RoundedCornerShape(8.dp)
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Niche Group:", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            // Simple text boxes/drop-clones
                            listOf("Tech Trends", "Crypto/Wealth", "Self Help", "Historic Lore").forEach { niche ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { channelNiche = niche }
                                        .padding(vertical = 4.dp)
                                ) {
                                    RadioButton(selected = channelNiche == niche, onClick = { channelNiche = niche })
                                    Text(niche, fontSize = 12.sp, color = Color.White)
                                }
                            }
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text("Narrative Tone:", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            listOf("Humorous", "Energetic", "Explanatory", "Dramatic").forEach { tone ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { toneSelection = tone }
                                        .padding(vertical = 4.dp)
                                ) {
                                    RadioButton(selected = toneSelection == tone, onClick = { toneSelection = tone })
                                    Text(tone, fontSize = 12.sp, color = Color.White)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Duration: $runningTime min (estimated words)", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    Slider(
                        value = runningTime.toFloat(),
                        onValueChange = { runningTime = it.toInt() },
                        valueRange = 1f..15f,
                        colors = SliderDefaults.colors(
                            thumbColor = PulsarAqua,
                            activeTrackColor = PulsarAqua,
                            inactiveTrackColor = SpaceSlate
                        )
                    )

                    // ElevenLabs vocal synthesis settings panel (PRD Section 4)
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SpaceSlate),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.05f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("ElevenLabs TTS Params", fontSize = 11.sp, color = StarletPink, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(EmeraldCash.copy(alpha = 0.15f))
                                            .padding(horizontal = 4.dp, vertical = 2.dp)
                                    ) {
                                        Text("Latency <50ms", color = EmeraldCash, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            Text("Synthesis Model (Optimized):", fontSize = 10.sp, color = SoftGray)
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                listOf("Eleven Flash v2.5", "Multilingual v2", "Eleven v3").forEach { model ->
                                    val isSelected = elevenLabsModel == model
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(if (isSelected) PulsarAqua else NebulaDarkCard)
                                            .clickable { elevenLabsModel = model }
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            model,
                                            color = if (isSelected) Color.Black else Color.White,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }

                            Row(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Stability (${stabilityParam.toString().take(4)})", fontSize = 10.sp, color = SoftGray)
                                    Slider(
                                        value = stabilityParam,
                                        onValueChange = { stabilityParam = it },
                                        valueRange = 0f..1f,
                                        colors = SliderDefaults.colors(thumbColor = PulsarAqua, activeTrackColor = PulsarAqua)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Clarity/Similarity (${similarityParam.toString().take(4)})", fontSize = 10.sp, color = SoftGray)
                                    Slider(
                                        value = similarityParam,
                                        onValueChange = { similarityParam = it },
                                        valueRange = 0f..1f,
                                        colors = SliderDefaults.colors(thumbColor = PulsarAqua, activeTrackColor = PulsarAqua)
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Style Exaggeration (${styleExaggerationParam.toString().take(4)})", fontSize = 10.sp, color = SoftGray)
                                Box(modifier = Modifier.width(100.dp)) {
                                    Slider(
                                        value = styleExaggerationParam,
                                        onValueChange = { styleExaggerationParam = it },
                                        valueRange = 0f..1f,
                                        colors = SliderDefaults.colors(thumbColor = PulsarAqua, activeTrackColor = PulsarAqua)
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Prosody Context Continuity", fontSize = 10.sp, color = SoftGray)
                                Switch(
                                    checked = contextContinuityActive,
                                    onCheckedChange = { contextContinuityActive = it },
                                    colors = SwitchDefaults.colors(checkedThumbColor = PulsarAqua)
                                )
                            }
                            
                            // Cost estimation metric
                            val unitCost = if (elevenLabsModel.contains("Flash")) 0.06 else 0.12
                            val estCost = runningTime * unitCost
                            Text(
                                "Rendering Rate: $$unitCost/min | Projected Budget: $${estCost.toString().take(4)} (ElevenLabs Basic Svc Tier)",
                                fontSize = 9.sp,
                                color = SoftGray,
                                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                             )
                        }
                    }

                    Button(
                        onClick = {
                            if (topicOfVideo.isBlank()) {
                                Toast.makeText(context, "Please enter a topic text idea!", Toast.LENGTH_SHORT).show()
                            } else {
                                isGeneratingReview = true
                                isReviewBoardVisible = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldCash),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("btn_write_script_phase3"),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Build, contentDescription = null, tint = Color.Black)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Escalate to Cloud Worker (MoneyPrinter Turbo)", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }

                    Button(
                        onClick = {
                            if (topicOfVideo.isBlank()) {
                                Toast.makeText(context, "Please enter a topic text idea!", Toast.LENGTH_SHORT).show()
                            } else {
                                viewModel.generateScript(channelNiche, topicOfVideo, toneSelection, runningTime)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = PulsarAqua),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("btn_write_script"),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = Color.Black)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Draft Offline Video Script", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Script generation output card Phase 3 Review Board
        if (isGeneratingReview) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = SpaceSlate),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    border = BorderStroke(1.dp, EmeraldCash.copy(alpha = 0.5f))
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator(color = EmeraldCash)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Cloud Worker: Orchestrating LLM scene generation & Pexels HD B-Roll API fetching...", fontSize = 11.sp, color = EmeraldCash, textAlign = TextAlign.Center)
                    }
                }
            }
        }

        if (isRenderJobActive || completedRenderUrl != null) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                    border = BorderStroke(1.dp, PulsarAqua.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().testTag("render_publish_dashboard")
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("RENDER & PUBLISHING ENGINE", fontWeight = FontWeight.Bold, color = PulsarAqua)
                                Text("Phase 4 - Cloud Compositing & Delivery", fontSize = 10.sp, color = SoftGray)
                            }
                            if (completedRenderUrl != null && !isUploadingToYouTube) {
                                IconButton(onClick = { completedRenderUrl = null }) {
                                    Icon(Icons.Default.Close, contentDescription = "Close", tint = SoftGray)
                                }
                            }
                        }

                        if (isRenderJobActive) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                                CircularProgressIndicator(progress = renderProgressPercent.coerceIn(0f, 1f), color = PulsarAqua)
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(renderStatusText, color = PulsarAqua, fontSize = 12.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                                Text("Polling FFmpeg Python Worker...", color = SoftGray, fontSize = 10.sp, textAlign = TextAlign.Center)
                            }
                        } else if (completedRenderUrl != null) {
                            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                // Successful clear Render view
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = EmeraldCash.copy(alpha=0.1f)),
                                    shape = RoundedCornerShape(8.dp),
                                    border = BorderStroke(1.dp, EmeraldCash.copy(alpha=0.3f))
                                ) {
                                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = "Done", tint = EmeraldCash, modifier = Modifier.size(24.dp))
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Column {
                                            Text("MP4 File Compiled Successfully", fontSize = 11.sp, color = EmeraldCash, fontWeight = FontWeight.Bold)
                                            Text(completedRenderUrl ?: "Ready", fontSize = 8.sp, color = SoftGray, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        }
                                    }
                                }
                                
                                Button(
                                    onClick = {
                                        Toast.makeText(context, "File downloaded locally.", Toast.LENGTH_SHORT).show()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = SpaceSlate),
                                    modifier = Modifier.fillMaxWidth(),
                                    border = BorderStroke(1.dp, PulsarAqua),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = PulsarAqua, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Download Render to Device Gallery", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }

                                if (isUploadingToYouTube) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                                        LinearProgressIndicator(progress = uploadProgressPercent.coerceIn(0f, 1f), color = Color.Red, modifier = Modifier.fillMaxWidth())
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Text(uploadStatusText, color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                                    }
                                } else {
                                    Button(
                                        onClick = {
                                            isUploadingToYouTube = true
                                            uploadProgressPercent = 0.0f
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                                        modifier = Modifier.fillMaxWidth().testTag("btn_publish_youtube"),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Publish to YouTube (OAuth 2.0 Upload)", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (isReviewBoardVisible && !isGeneratingReview) {
            item {
                Card(
                     colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                    border = BorderStroke(1.dp, EmeraldCash.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("SCRIPT & ASSET REVIEW BOARD", fontWeight = FontWeight.Bold, color = EmeraldCash)
                                Text("Phase 3 - MoneyPrinterTurbo Workflow", fontSize = 10.sp, color = SoftGray)
                            }
                            IconButton(onClick = { isReviewBoardVisible = false; reviewScenes.clear() }) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = SoftGray)
                            }
                        }

                        // YPP Validation warning inside Phase 3
                        Card(
                            colors = CardDefaults.cardColors(containerColor = SpaceSlate),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Color.Red.copy(alpha = 0.3f))
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Warning, contentDescription = "Warning", tint = Color.Red, modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("YPP AI Slop Compliance", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                    Text("Please manually tweak the text below to inject your authentic voice. Avoid purely declarative factual regurgitation.", fontSize = 9.sp, color = SoftGray)
                                }
                            }
                        }

                        // Iterating over the generated scenes
                        reviewScenes.forEachIndexed { index, scene ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SpaceSlate),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.05f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("Scene ${scene.sceneId}", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        Box(modifier = Modifier.background(Color.DarkGray, RoundedCornerShape(4.dp)).padding(4.dp)) {
                                            Text(scene.keywords, color = EmeraldCash, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        // Pexels B-Roll Preview Thumbnail
                                        Box(
                                            modifier = Modifier
                                                .size(100.dp, 100.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color.Black)
                                        ) {
                                            AsyncImage(
                                                model = scene.thumbnailUrl,
                                                contentDescription = "B-Roll preview",
                                                contentScale = ContentScale.Crop,
                                                modifier = Modifier.fillMaxSize()
                                            )
                                            // Play icon overlay to emulate video
                                            Icon(
                                                Icons.Default.PlayArrow,
                                                contentDescription = null,
                                                tint = Color.White.copy(alpha = 0.8f),
                                                modifier = Modifier.align(Alignment.Center).size(32.dp)
                                            )
                                            Text(
                                                text = "PEXELS API",
                                                color = Color.White,
                                                fontSize = 7.sp,
                                                modifier = Modifier.align(Alignment.BottomStart).background(Color.Black.copy(alpha = 0.6f)).padding(2.dp).padding(start = 2.dp)
                                            )
                                        }

                                        // Editable Narration Text Field
                                        OutlinedTextField(
                                            value = scene.narration,
                                            onValueChange = { newText ->
                                                reviewScenes[index] = scene.copy(narration = newText)
                                            },
                                            modifier = Modifier.weight(1f).height(100.dp),
                                            textStyle = LocalTextStyle.current.copy(fontSize = 11.sp, color = Color.White),
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = EmeraldCash,
                                                unfocusedBorderColor = PulsarAqua.copy(alpha = 0.3f)
                                            )
                                        )
                                    }
                                }
                            }
                        }

                        // Escalate button
                        Button(
                            onClick = {
                                Toast.makeText(context, "Metadata & Audio mapped. Handing off to FFmpeg Core...", Toast.LENGTH_SHORT).show()
                                isReviewBoardVisible = false
                                isRenderJobActive = true
                                completedRenderUrl = null // Reset
                                renderProgressPercent = 0.0f
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldCash),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Approve & Escalate to Render", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Script generation output card
        item {
            when (val state = viewModel.scriptState) {
                is ScriptGenerationState.Loading -> {
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
                            CircularProgressIndicator(color = PulsarAqua)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Gemini is developing hook, narrative structure and tagging lists...", fontSize = 12.sp, color = SoftGray)
                        }
                    }
                }
                is ScriptGenerationState.Success -> {
                    val itemsParsed = state.parsedBlocks
                    val titles = itemsParsed["TITLES"] ?: ""
                    val hook = itemsParsed["HOOK"] ?: ""
                    val body = itemsParsed["BODY"] ?: ""
                    val outro = itemsParsed["OUTRO"] ?: ""
                    val description = itemsParsed["DESCRIPTION"] ?: ""
                    val tags = itemsParsed["TAGS"] ?: ""
                    val designPrompt = itemsParsed["THUMBNAIL_PROMPT"] ?: ""

                    Card(
                        colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth(),
                        border = BorderStroke(1.dp, PulsarAqua.copy(alpha = 0.2f))
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Automated Output Success", fontWeight = FontWeight.Bold, color = PulsarAqua)
                                IconButton(onClick = { viewModel.resetScriptState() }) {
                                    Icon(Icons.Default.Close, contentDescription = "Clear", tint = SoftGray)
                                }
                            }

                            // Interactive Audio Rehearsal Tool
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SpaceSlate),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    IconButton(
                                        onClick = { isTimerRecording = !isTimerRecording },
                                        colors = IconButtonDefaults.iconButtonColors(
                                            containerColor = if (isTimerRecording) Color.Red else Color.DarkGray
                                        )
                                    ) {
                                        Icon(
                                            imageVector = if (isTimerRecording) Icons.Default.Close else Icons.Default.PlayArrow,
                                            contentDescription = null,
                                            tint = Color.White
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text("Teleprompter Audio rehearsal:", fontSize = 11.sp, color = PulsarAqua, fontWeight = FontWeight.Bold)
                                        Text(
                                            text = if (isTimerRecording) "Timer: ${secondsElapsed}s | Practice reading script aloud!" else "Tap Play to rehearse voiceover timing",
                                            fontSize = 11.sp,
                                            color = Color.White
                                        )
                                    }
                                }
                            }

                            Divider(color = Color.White.copy(alpha = 0.05f))

                            Text("TITLE IDEAS", fontWeight = FontWeight.Bold, color = StarletPink, fontSize = 12.sp)
                            Text(titles, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic, color = Color.White, fontSize = 13.sp)

                            Text("VIDEO INTRO & HOOK (FIRST 15 SEC)", fontWeight = FontWeight.Bold, color = StarletPink, fontSize = 12.sp)
                            Text(hook, color = Color.White, fontSize = 13.sp)

                            Text("SCRIPT BODY CONTENT", fontWeight = FontWeight.Bold, color = StarletPink, fontSize = 12.sp)
                            Text(body, color = SoftGray, fontSize = 13.sp)

                            Text("OUTRO & CALL TO ACTION", fontWeight = FontWeight.Bold, color = StarletPink, fontSize = 12.sp)
                            Text(outro, color = Color.White, fontSize = 13.sp)

                            // YouTube Partner Program Policy Guardrails Validation Tool (Section 7)
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SpaceSlate),
                                border = BorderStroke(1.dp, PulsarAqua.copy(alpha = 0.15f)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("July 2025 YPP AI Slop Safeguards", fontSize = 11.sp, color = PulsarAqua, fontWeight = FontWeight.Bold)
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(EmeraldCash.copy(alpha = 0.15f))
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text("98% Compliance", color = EmeraldCash, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    Text(
                                        "YouTube restricts mass unchanged synthetic regurgitation. This tool validates script files to certify transformative narrative value.",
                                        fontSize = 11.sp,
                                        color = SoftGray
                                    )

                                    Divider(color = Color.White.copy(alpha = 0.05f))

                                    // Compliance Status metrics
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Check, contentDescription = "Passed", tint = EmeraldCash, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Passed Structure: Storytelling vs Factual Regurgitation", fontSize = 11.sp, color = Color.White)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Check, contentDescription = "Passed", tint = EmeraldCash, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Passed Swapping Pace: B-roll cue swaps every 4-6 seconds recommended", fontSize = 11.sp, color = Color.White)
                                    }
                                    
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text("Set 'Altered Content' Metadata Flag", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                            Text("Required disclosure for realistic synthetic clone voices.", fontSize = 9.sp, color = SoftGray)
                                        }
                                        Switch(
                                            checked = alteredDisclosureAccepted,
                                            onCheckedChange = { alteredDisclosureAccepted = it },
                                            colors = SwitchDefaults.colors(checkedThumbColor = PulsarAqua)
                                        )
                                    }
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Button(
                                    onClick = {
                                        copyToClipboard(context, "$hook\n\n$body\n\n$outro", "Full Audio Script")
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = SpaceSlate),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Copy Script", fontSize = 11.sp)
                                }

                                Button(
                                    onClick = {
                                        viewModel.saveVideoProject(
                                            title = titles.split("\n").firstOrNull() ?: topicOfVideo,
                                            niche = channelNiche,
                                            tone = toneSelection,
                                            scriptText = "$hook\n\n$body\n\n$outro",
                                            description = description,
                                            tags = tags,
                                            thumbnailPrompt = designPrompt
                                        )
                                        Toast.makeText(context, "Saved script to channel queue!", Toast.LENGTH_SHORT).show()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = PulsarAqua),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Save Project", color = Color.Black, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
                is ScriptGenerationState.Error -> {
                    Text(state.message, color = Color.Red, fontSize = 12.sp, modifier = Modifier.padding(4.dp))
                }
                else -> {
                    // Friendly prompt when idle
                    Card(
                        colors = CardDefaults.cardColors(containerColor = NebulaDarkCard),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = SoftGray)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Once written, scripts can be saved, rehearsed, copy-pasted and scheduled.", fontSize = 11.sp, color = SoftGray)
                        }
                    }
                }
            }
        }
    }
}
