package com.example.viewmodel

import android.content.Context
import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.api.GeminiApiClient
import com.example.data.local.AppDatabase
import com.example.data.local.CustomAvatar
import com.example.data.local.ProjectRepository
import com.example.data.local.VideoProject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

sealed interface ScriptGenerationState {
    object Idle : ScriptGenerationState
    object Loading : ScriptGenerationState
    data class Success(
        val rawText: String,
        val parsedBlocks: Map<String, String>
    ) : ScriptGenerationState
    data class Error(val message: String) : ScriptGenerationState
}

sealed interface AvatarGenerationState {
    object Idle : AvatarGenerationState
    object Loading : AvatarGenerationState
    data class Success(
        val rawText: String,
        val parsedBlocks: Map<String, String>
    ) : AvatarGenerationState
    data class Error(val message: String) : AvatarGenerationState
}

class ProjectViewModel(application: Application) : AndroidViewModel(application) {
    private val database = AppDatabase.getDatabase(application)
    private val repository = ProjectRepository(database.projectDao())

    private val prefs = application.getSharedPreferences("avatar_prefs", Context.MODE_PRIVATE)

    var readyPlayerMeModelId by mutableStateOf(
        prefs.getString("rpm_model_id", "64f9bfdf1cd1c93a1c223add") ?: "64f9bfdf1cd1c93a1c223add"
    )

    fun saveRpmModelId(id: String) {
        readyPlayerMeModelId = id
        prefs.edit().putString("rpm_model_id", id).apply()
    }

    // UI State for persistence values from database
    val videoProjects: StateFlow<List<VideoProject>> = repository.allVideoProjects
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val customAvatars: StateFlow<List<CustomAvatar>> = repository.allCustomAvatars
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // --- Interactive Custom Avatar Lab State ---
    var customName by mutableStateOf("My AI Host")
    var baseStyle by mutableStateOf("TECH_GURU") // "TECH_GURU", "COSMIC_GAMER", "WEALTH_MENTOR", "ZEN_COACH"
    var primaryColorHex by mutableStateOf("#00E5FF") // Electric Cyan
    var accentColorHex by mutableStateOf("#FF3D00")  // Safety Orange / Red
    var bgColorHex by mutableStateOf("#0E1626")      // Deep Navy Space
    var frameStyle by mutableStateOf("NEON_RING")    // "CIRCULAR", "HEXAGON", "SHARP_BOX", "NEON_RING"
    var accessoryType by mutableStateOf("HEADPHONES") // "NONE", "GLASSES", "HEADPHONES", "MICROPHONE", "HALO"
    var avatarAiPromptText by mutableStateOf("A gorgeous tech avatar profile picture.")

    // --- API Action States ---
    var scriptState by mutableStateOf<ScriptGenerationState>(ScriptGenerationState.Idle)
        private set

    var avatarState by mutableStateOf<AvatarGenerationState>(AvatarGenerationState.Idle)
        private set

    init {
        updateAiPromptBasedOnState()
    }

    // --- Dynamic AI Prompt Builder for Custom Canvas States ---
    fun updateAiPromptBasedOnState() {
        avatarAiPromptText = "Professional YouTube Avatar profile picture, customized for a YouTube channel host. " +
                "Style: $baseStyle. " +
                "Primary branding color is $primaryColorHex, with bright accents of $accentColorHex. " +
                "The scene contains a clean $bgColorHex backdrop. " +
                "The character features an optional styling frame shape of type $frameStyle, and displays visual accessory: $accessoryType. " +
                "Ultra-high quality 3D render, minimalist vector shading, crisp contours, YouTube channel icon standard."
    }

    // --- Script Generation Workflow ---
    fun generateScript(
        niche: String,
        topic: String,
        tone: String,
        durationMinutes: Int
    ) {
        viewModelScope.launch {
            scriptState = ScriptGenerationState.Loading
            try {
                val rawResponse = GeminiApiClient.generateScriptAndMetadata(niche, topic, tone, durationMinutes)
                if (rawResponse != null) {
                    val parsed = GeminiApiClient.parseTagBlocks(rawResponse)
                    scriptState = ScriptGenerationState.Success(rawResponse, parsed)
                } else {
                    scriptState = ScriptGenerationState.Error("Failed to generate script. Check your internet connection or verify your Gemini API key in the AI Studio Secrets panel.")
                }
            } catch (e: Exception) {
                scriptState = ScriptGenerationState.Error("An unexpected error occurred: ${e.localizedMessage}")
            }
        }
    }

    fun resetScriptState() {
        scriptState = ScriptGenerationState.Idle
    }

    // --- Avatar Branding Generation Workflow ---
    fun generateAvatarBranding(
        channelTopic: String,
        visualStyle: String,
        mood: String
    ) {
        viewModelScope.launch {
            avatarState = AvatarGenerationState.Loading
            try {
                val rawResponse = GeminiApiClient.generateAvatarPromptAndGuidance(channelTopic, visualStyle, mood)
                if (rawResponse != null) {
                    val parsed = GeminiApiClient.parseTagBlocks(rawResponse)
                    avatarState = AvatarGenerationState.Success(rawResponse, parsed)
                    
                    // Auto-load generated attributes into our avatar builder
                    parsed["AVATAR_NAME"]?.let { customName = it }
                    parsed["GENERATIVE_AI_PROMPT"]?.let { avatarAiPromptText = it }
                    
                    // Procedurally choose theme parameters based on generated styles
                    when (visualStyle.uppercase()) {
                        "TECH GURU" -> {
                            baseStyle = "TECH_GURU"
                            primaryColorHex = "#00DFFF"
                            accentColorHex = "#FF1493"
                            bgColorHex = "#0B0E14"
                        }
                        "COSMIC GAMER" -> {
                            baseStyle = "COSMIC_GAMER"
                            primaryColorHex = "#FF00FF"
                            accentColorHex = "#00FFFF"
                            bgColorHex = "#120224"
                        }
                        "WEALTH MENTOR" -> {
                            baseStyle = "WEALTH_MENTOR"
                            primaryColorHex = "#D4AF37" // Metallic Gold
                            accentColorHex = "#0D5C34" // Emerald Green
                            bgColorHex = "#0D0D0D"      // Onyx
                        }
                        "ZEN COACH" -> {
                            baseStyle = "ZEN_COACH"
                            primaryColorHex = "#64D28D" // Sea Foam Green
                            accentColorHex = "#E39E21" // Warm Yellow-Orange
                            bgColorHex = "#FAF9F6"      // Alabaster White
                        }
                    }
                } else {
                    avatarState = AvatarGenerationState.Error("Failed to generate design layout. Make sure you entered your Gemini API Key in the AI Studio Secrets panel.")
                }
            } catch (e: Exception) {
                avatarState = AvatarGenerationState.Error("Error: ${e.localizedMessage}")
            }
        }
    }

    fun resetAvatarState() {
        avatarState = AvatarGenerationState.Idle
    }

    // --- Database Operations ---
    fun saveVideoProject(
        title: String,
        niche: String,
        tone: String,
        scriptText: String,
        description: String,
        tags: String,
        thumbnailPrompt: String,
        status: String = "IDEA",
        scheduledTimeMillis: Long = 0L
    ) {
        viewModelScope.launch {
            val project = VideoProject(
                title = title,
                niche = niche,
                tone = tone,
                scriptText = scriptText,
                description = description,
                tags = tags,
                thumbnailPrompt = thumbnailPrompt,
                status = status,
                scheduledTimeMillis = scheduledTimeMillis
            )
            repository.insertVideoProject(project)
        }
    }

    fun updateVideoProjectStatus(project: VideoProject, newStatus: String, scheduledTime: Long = 0L) {
        viewModelScope.launch {
            val updated = project.copy(status = newStatus, scheduledTimeMillis = scheduledTime)
            repository.updateVideoProject(updated)
        }
    }

    fun deleteVideoProject(projectId: Int) {
        viewModelScope.launch {
            repository.deleteVideoProjectById(projectId)
        }
    }

    fun saveCustomAvatar() {
        viewModelScope.launch {
            val avatar = CustomAvatar(
                name = customName,
                baseStyle = baseStyle,
                primaryColor = primaryColorHex,
                accentColor = accentColorHex,
                bgColor = bgColorHex,
                frameStyle = frameStyle,
                accessory = accessoryType,
                aiPrompt = avatarAiPromptText
            )
            repository.insertCustomAvatar(avatar)
        }
    }

    fun deleteCustomAvatar(avatarId: Int) {
        viewModelScope.launch {
            repository.deleteCustomAvatarById(avatarId)
        }
    }
}
