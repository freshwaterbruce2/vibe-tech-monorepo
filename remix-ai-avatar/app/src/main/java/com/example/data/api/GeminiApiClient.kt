package com.example.data.api

import android.util.Log
import com.example.BuildConfig
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

// --- Moshi Data Classes for Gemini REST API ---

@JsonClass(generateAdapter = true)
data class Part(val text: String)

@JsonClass(generateAdapter = true)
data class Content(val parts: List<Part>)

@JsonClass(generateAdapter = true)
data class GenerateContentRequest(val contents: List<Content>)

@JsonClass(generateAdapter = true)
data class Candidate(val content: Content?)

@JsonClass(generateAdapter = true)
data class GenerateContentResponse(val candidates: List<Candidate>?)

// --- Retrofit Service Interface ---

interface GeminiApiService {
    @POST("v1beta/models/{model}:generateContent")
    suspend fun generateContent(
        @Path("model") model: String,
        @Query("key") apiKey: String,
        @Body request: GenerateContentRequest
    ): GenerateContentResponse
}

/**
 * GeminiApiClient migrated to Phase 10: Security Pivot & Direct REST API.
 * Eliminating client-side Firebase AI SDK routing while maintaining support for the Secrets panel.
 */
object GeminiApiClient {
    private const val TAG = "GeminiApiClient"
    private const val BASE_URL = "https://generativelanguage.googleapis.com/"

    private val moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    private val apiService: GeminiApiService by lazy {
        retrofit.create(GeminiApiService::class.java)
    }

    suspend fun generateScriptAndMetadata(
        niche: String,
        topic: String,
        tone: String,
        durationMinutes: Int
    ): String? = withContext(Dispatchers.IO) {
        val prompt = """
            Write a complete, highly optimized and engaging script for a $durationMinutes minute YouTube Video.
            Topic: "$topic" in the "$niche" niche.
            Tone: "$tone" (expert yet inviting for video automated channels).
            
            You must format your entire response using the following precise tag blocks so the app can parse them perfectly. Do not include any other conversations, text, markdown blocks, prefix statements, or comments.
            
            [TITLES]
            (Provide 3 viral, high-CTR clickable title ideas, one per line)
            
            [HOOK]
            (Write an attention-grabbing hook for the first 15 seconds)
            
            [BODY]
            (Write the detailed, full script body. Be engaging, clear, and informative)
            
            [OUTRO]
            (Write a strong closing outro with a clean Call To Action to like, subscribe and comment)
            
            [DESCRIPTION]
            (Write a search-engine optimized YouTube video description with structured layout)
            
            [TAGS]
            (Provide 10-15 comma-separated high-traffic search terms/tags)
            
            [THUMBNAIL_PROMPT]
            (Explain a beautiful, high-click design for the thumbnail and write a detailed generative AI prompt to create it)
        """.trimIndent()

        return@withContext makeApiCall("gemini-3.5-flash", prompt)
    }

    suspend fun generateAvatarPromptAndGuidance(
        topic: String,
        avatarStyle: String,
        mood: String
    ): String? = withContext(Dispatchers.IO) {
        val prompt = """
            Create a highly detailed, professional AI Avatar Design Proposal for a YouTube channel focusing on "$topic".
            Avatar Style Preference: "$avatarStyle"
            Tone Accent / Mood: "$mood"
            
            Format your response exactly with these sections for easy reading in-app:
            
            [AVATAR_NAME]
            (Generate a clean, trendy 1-2 word name for this AI avatar host)
            
            [VISUAL_THEME]
            (Describe the visual theme: colors, fashion, expression, hair and features)
            
            [GENERATIVE_AI_PROMPT]
            (An ultra-detailed prompt that can be copy-pasted into Midjourney, Imagen, or DALL-E 3 to render this avatar portrait in pristine quality. Use photography or digital art keywords)
            
            [CHANNEL_BRANDING]
            (Suggest channel aesthetics: banner layout, color codes, visual guidelines, and thumbnail styles aligned with this host)
        """.trimIndent()

        return@withContext makeApiCall("gemini-3.5-flash", prompt)
    }

    private suspend fun makeApiCall(model: String, prompt: String): String? {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            Log.e(TAG, "Gemini API Key is a placeholder or empty. Please enter your API Key in the AI Studio Secrets panel.")
            return null
        }
        return try {
            val request = GenerateContentRequest(contents = listOf(Content(parts = listOf(Part(text = prompt)))))
            val response = apiService.generateContent(model, apiKey, request)
            response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
        } catch (e: Exception) {
            Log.e(TAG, "Error during direct Gemini API call", e)
            null
        }
    }

    // Direct parser helper to break up tags
    fun parseTagBlocks(text: String): Map<String, String> {
        val result = mutableMapOf<String, String>()
        val tags = listOf(
            "TITLES", "HOOK", "BODY", "OUTRO", "DESCRIPTION", "TAGS", "THUMBNAIL_PROMPT",
            "AVATAR_NAME", "VISUAL_THEME", "GENERATIVE_AI_PROMPT", "CHANNEL_BRANDING"
        )
        
        var currentTag: String? = null
        val currentContent = StringBuilder()

        val lines = text.split("\n")
        for (line in lines) {
            val trimmed = line.trim()
            val matchedTag = tags.firstOrNull { trimmed.equals("[$it]", ignoreCase = true) }
            
            if (matchedTag != null) {
                if (currentTag != null) {
                    result[currentTag] = currentContent.toString().trim()
                }
                currentTag = matchedTag
                currentContent.clear()
            } else {
                if (currentTag != null) {
                    currentContent.append(line).append("\n")
                }
            }
        }
        
        if (currentTag != null) {
            result[currentTag] = currentContent.toString().trim()
        }
        
        return result
    }
}
