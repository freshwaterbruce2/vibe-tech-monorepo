package com.example.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import java.util.Locale

// Helper function to safely parse Hex Color Strings (e.g. #FF1E00)
fun parseHexColor(hex: String, fallback: Color = Color.Magenta): Color {
    val cleanHex = if (hex.startsWith("#")) hex else "#$hex"
    return try {
        Color(android.graphics.Color.parseColor(cleanHex))
    } catch (e: Exception) {
        // Fallback checks for common color terms or standard fallback
        fallback
    }
}

@Composable
fun AvatarCanvas(
    baseStyle: String,
    primaryColorHex: String,
    accentColorHex: String,
    bgColorHex: String,
    frameStyle: String,
    accessoryType: String,
    modifier: Modifier = Modifier,
    visemeValue: Int = 0
) {
    val primaryColor = parseHexColor(primaryColorHex, Color(0xFF00E5FF))
    val accentColor = parseHexColor(accentColorHex, Color(0xFFFF3D00))
    val bgColor = parseHexColor(bgColorHex, Color(0xFF0E1626))

    Canvas(modifier = modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height
        val centerX = width / 2f
        val centerY = height / 2f
        val radius = size.minDimension / 2.3f

        // 1. Draw Background
        drawCircle(
            color = bgColor,
            radius = radius * 1.05f,
            center = center
        )

        // Draw background grid/particles depending on the theme
        when (baseStyle.uppercase(Locale.ROOT)) {
            "COSMIC_GAMER" -> {
                // Diagonal star dust particles
                for (i in 1..8) {
                    val px = centerX + (radius * 0.7f * kotlin.math.cos(i * 0.8f))
                    val py = centerY + (radius * 0.7f * kotlin.math.sin(i * 0.8f))
                    drawCircle(
                        color = accentColor.copy(alpha = 0.4f),
                        radius = 4.dp.toPx(),
                        center = Offset(px, py)
                    )
                }
            }
            "TECH_GURU" -> {
                // Linear digital circuit paths
                drawLine(
                    color = primaryColor.copy(alpha = 0.25f),
                    start = Offset(centerX - radius, centerY),
                    end = Offset(centerX + radius, centerY),
                    strokeWidth = 2.dp.toPx()
                )
                drawLine(
                    color = primaryColor.copy(alpha = 0.25f),
                    start = Offset(centerX, centerY - radius),
                    end = Offset(centerX, centerY + radius),
                    strokeWidth = 2.dp.toPx()
                )
            }
            "WEALTH_MENTOR" -> {
                // Dynamic golden concentric rings
                drawCircle(
                    color = primaryColor.copy(alpha = 0.15f),
                    radius = radius * 0.8f,
                    style = Stroke(width = 1.dp.toPx())
                )
                drawCircle(
                    color = primaryColor.copy(alpha = 0.1f),
                    radius = radius * 0.5f,
                    style = Stroke(width = 1.dp.toPx())
                )
            }
            "ZEN_COACH" -> {
                // Soothing horizontal lines
                for (i in -3..3) {
                    drawLine(
                        color = primaryColor.copy(alpha = 0.15f),
                        start = Offset(centerX - radius, centerY + (i * 20.dp.toPx())),
                        end = Offset(centerX + radius, centerY + (i * 20.dp.toPx())),
                        strokeWidth = 1.dp.toPx()
                    )
                }
            }
        }

        // 2. Draw Portrait Base Silhouette / Facial Features
        // Body base / Shoulder curves
        val bodyPath = Path().apply {
            moveTo(centerX - radius * 0.6f, centerY + radius * 0.9f)
            quadraticTo(
                centerX - radius * 0.5f, centerY + radius * 0.35f,
                centerX - radius * 0.3f, centerY + radius * 0.3f
            )
            lineTo(centerX + radius * 0.3f, centerY + radius * 0.3f)
            quadraticTo(
                centerX + radius * 0.5f, centerY + radius * 0.35f,
                centerX + radius * 0.6f, centerY + radius * 0.9f
            )
            close()
        }
        drawPath(
            path = bodyPath,
            brush = Brush.linearGradient(
                colors = listOf(primaryColor.copy(alpha = 0.85f), primaryColor.copy(alpha = 0.45f)),
                start = Offset(centerX, centerY),
                end = Offset(centerX, centerY + radius)
            )
        )

        // Neck
        drawRect(
            color = primaryColor.copy(alpha = 0.9f),
            topLeft = Offset(centerX - radius * 0.12f, centerY + radius * 0.1f),
            size = Size(radius * 0.24f, radius * 0.25f)
        )

        // Head/Face shape
        drawCircle(
            color = primaryColor,
            radius = radius * 0.32f,
            center = Offset(centerX, centerY - radius * 0.15f)
        )

        // Draw Face Details (Eyes & Smile) based on Styles
        val eyeY = centerY - radius * 0.2f
        when (baseStyle.uppercase(Locale.ROOT)) {
            "COSMIC_GAMER" -> {
                // Neon horizontal retro visor eyes
                drawRoundRect(
                    color = accentColor,
                    topLeft = Offset(centerX - radius * 0.18f, eyeY - 4.dp.toPx()),
                    size = Size(radius * 0.36f, 8.dp.toPx()),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx())
                )
            }
            "TECH_GURU" -> {
                // Tech Glasses or Glowing dots
                drawCircle(color = accentColor, radius = 5.dp.toPx(), center = Offset(centerX - radius * 0.11f, eyeY))
                drawCircle(color = accentColor, radius = 5.dp.toPx(), center = Offset(centerX + radius * 0.11f, eyeY))
                // Smart connect line
                drawLine(color = accentColor, start = Offset(centerX - radius * 0.11f, eyeY), end = Offset(centerX + radius * 0.11f, eyeY), strokeWidth = 2.dp.toPx())
            }
            "WEALTH_MENTOR" -> {
                // Sharp confident closed-eye lines
                drawLine(
                    color = bgColor,
                    start = Offset(centerX - radius * 0.15f, eyeY),
                    end = Offset(centerX - radius * 0.05f, eyeY + 2.dp.toPx()),
                    strokeWidth = 3.dp.toPx()
                )
                drawLine(
                    color = bgColor,
                    start = Offset(centerX + radius * 0.05f, eyeY + 2.dp.toPx()),
                    end = Offset(centerX + radius * 0.15f, eyeY),
                    strokeWidth = 3.dp.toPx()
                )
            }
            else -> { // ZEN_COACH or general
                // Peaceful closed curved eyes
                val eyeLeft = Path().apply {
                    moveTo(centerX - radius * 0.15f, eyeY - 2.dp.toPx())
                    quadraticTo(centerX - radius * 0.1f, eyeY + 4.dp.toPx(), centerX - radius * 0.05f, eyeY - 2.dp.toPx())
                }
                val eyeRight = Path().apply {
                    moveTo(centerX + radius * 0.05f, eyeY - 2.dp.toPx())
                    quadraticTo(centerX + radius * 0.1f, eyeY + 4.dp.toPx(), centerX + radius * 0.15f, eyeY - 2.dp.toPx())
                }
                drawPath(eyeLeft, color = bgColor, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round))
                drawPath(eyeRight, color = bgColor, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round))
            }
        }

        // Mouth draw according to 8-viseme values (PRD section 3.1)
        val smileY = centerY - radius * 0.05f
        val mouthColor = if (baseStyle == "WEALTH_MENTOR") primaryColorHex.let { parseHexColor(it).copy(alpha = 0.8f) } else bgColor
        
        when (visemeValue) {
            1 -> { // Open / A: Large open oval shape
                drawOval(
                    color = mouthColor,
                    topLeft = Offset(centerX - radius * 0.06f, smileY - radius * 0.04f),
                    size = Size(radius * 0.12f, radius * 0.10f)
                )
            }
            2 -> { // Closed / M, B, P: High-tight horizontal line
                drawLine(
                    color = mouthColor,
                    start = Offset(centerX - radius * 0.07f, smileY),
                    end = Offset(centerX + radius * 0.07f, smileY),
                    strokeWidth = 3.dp.toPx()
                )
            }
            3 -> { // Oval / O, U: Small high-density circle / oval
                drawCircle(
                    color = mouthColor,
                    radius = radius * 0.04f,
                    center = Offset(centerX, smileY)
                )
            }
            4 -> { // Dental / T, S: Medium open width displaying teeth
                // Outer shape
                drawRect(
                    color = mouthColor,
                    topLeft = Offset(centerX - radius * 0.07f, smileY - radius * 0.02f),
                    size = Size(radius * 0.14f, radius * 0.06f)
                )
                // Teeth bar
                drawLine(
                    color = Color.White,
                    start = Offset(centerX - radius * 0.06f, smileY - radius * 0.01f),
                    end = Offset(centerX + radius * 0.06f, smileY - radius * 0.01f),
                    strokeWidth = 2.dp.toPx()
                )
            }
            5 -> { // Smiling / E, I: Curved open crescent smile
                val crescentPath = Path().apply {
                    moveTo(centerX - radius * 0.08f, smileY)
                    quadraticTo(centerX, smileY + radius * 0.07f, centerX + radius * 0.08f, smileY)
                    quadraticTo(centerX, smileY + radius * 0.01f, centerX - radius * 0.08f, smileY)
                }
                drawPath(
                    path = crescentPath,
                    color = mouthColor
                )
            }
            6 -> { // Pucker / W: Tiny tight circle
                drawCircle(
                    color = mouthColor,
                    radius = radius * 0.02f,
                    center = Offset(centerX, smileY)
                )
            }
            7 -> { // Upper Teeth / F, V: Lower lip curved upward meeting upper line
                val outerPath = Path().apply {
                    moveTo(centerX - radius * 0.06f, smileY)
                    lineTo(centerX + radius * 0.06f, smileY)
                    quadraticTo(centerX, smileY + radius * 0.04f, centerX - radius * 0.06f, smileY)
                }
                drawPath(path = outerPath, color = mouthColor)
                // Upper teeth white line
                drawLine(
                    color = Color.White,
                    start = Offset(centerX - radius * 0.05f, smileY + 1.dp.toPx()),
                    end = Offset(centerX + radius * 0.05f, smileY + 1.dp.toPx()),
                    strokeWidth = 1.5.dp.toPx()
                )
            }
            else -> { // 0: Neutral / Idle: Classic small calm line
                val smilePath = Path().apply {
                    moveTo(centerX - radius * 0.07f, smileY)
                    quadraticTo(centerX, smileY + radius * 0.04f, centerX + radius * 0.07f, smileY)
                }
                drawPath(
                    path = smilePath,
                    color = mouthColor,
                    style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
                )
            }
        }

        // 3. Draw Selected Accessory Overlay
        when (accessoryType.uppercase(Locale.ROOT)) {
            "GLASSES" -> {
                // Stylish glasses
                drawCircle(
                    color = accentColor,
                    radius = radius * 0.1f,
                    center = Offset(centerX - radius * 0.12f, eyeY),
                    style = Stroke(width = 3.dp.toPx())
                )
                drawCircle(
                    color = accentColor,
                    radius = radius * 0.1f,
                    center = Offset(centerX + radius * 0.12f, eyeY),
                    style = Stroke(width = 3.dp.toPx())
                )
                drawLine(
                    color = accentColor,
                    start = Offset(centerX - radius * 0.02f, eyeY),
                    end = Offset(centerX + radius * 0.02f, eyeY),
                    strokeWidth = 3.dp.toPx()
                )
            }
            "HEADPHONES" -> {
                // Glowing Headset
                // Archer connector band
                val headY = centerY - radius * 0.15f
                val bandPath = Path().apply {
                    moveTo(centerX - radius * 0.35f, headY)
                    quadraticTo(centerX, headY - radius * 0.42f, centerX + radius * 0.35f, headY)
                }
                drawPath(bandPath, color = accentColor, style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round))
                // Ear cups
                drawRoundRect(
                    color = accentColor,
                    topLeft = Offset(centerX - radius * 0.38f, headY - radius * 0.15f),
                    size = Size(radius * 0.09f, radius * 0.3f),
                    cornerRadius = CornerRadius(6.dp.toPx(), 6.dp.toPx())
                )
                drawRoundRect(
                    color = accentColor,
                    topLeft = Offset(centerX + radius * 0.29f, headY - radius * 0.15f),
                    size = Size(radius * 0.09f, radius * 0.3f),
                    cornerRadius = CornerRadius(6.dp.toPx(), 6.dp.toPx())
                )
            }
            "MICROPHONE" -> {
                // Condenser podcast studio microphone in foreground
                val micX = centerX + radius * 0.25f
                val micY = centerY + radius * 0.1f
                // Desktop armature arm
                drawLine(
                    color = Color.DarkGray,
                    start = Offset(width, height),
                    end = Offset(micX, micY),
                    strokeWidth = 6.dp.toPx()
                )
                // Capsule holder
                drawCircle(
                    color = accentColor,
                    radius = 14.dp.toPx(),
                    center = Offset(micX, micY)
                )
                drawRoundRect(
                    color = Color.Black,
                    topLeft = Offset(micX - 8.dp.toPx(), micY - 20.dp.toPx()),
                    size = Size(16.dp.toPx(), 28.dp.toPx()),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx())
                )
                // Mesh accent lines
                drawLine(color = accentColor, start = Offset(micX - 8.dp.toPx(), micY - 10.dp.toPx()), end = Offset(micX + 8.dp.toPx(), micY - 10.dp.toPx()), strokeWidth = 1.dp.toPx())
                drawLine(color = accentColor, start = Offset(micX, micY - 20.dp.toPx()), end = Offset(micX, micY + 8.dp.toPx()), strokeWidth = 1.dp.toPx())
            }
            "HALO" -> {
                // Elite glowing rings hovering above
                val haloY = centerY - radius * 0.65f
                drawOval(
                    color = Color(0xFFFFD700), // Metallic Gold
                    topLeft = Offset(centerX - radius * 0.25f, haloY),
                    size = Size(radius * 0.5f, 15.dp.toPx()),
                    style = Stroke(width = 3.dp.toPx())
                )
            }
        }

        // 4. Draw Outer Branding Frames
        when (frameStyle.uppercase(Locale.ROOT)) {
            "CIRCULAR" -> {
                drawCircle(
                    color = primaryColor,
                    radius = radius * 1.02f,
                    style = Stroke(width = 4.dp.toPx())
                )
            }
            "HEXAGON" -> {
                val hexPath = Path().apply {
                    for (i in 0..5) {
                        val angle = i * (Math.PI / 3)
                        val x = centerX + radius * 1.05f * kotlin.math.cos(angle).toFloat()
                        val y = centerY + radius * 1.05f * kotlin.math.sin(angle).toFloat()
                        if (i == 0) moveTo(x, y) else lineTo(x, y)
                    }
                    close()
                }
                drawPath(hexPath, color = primaryColor, style = Stroke(width = 4.dp.toPx()))
            }
            "SHARP_BOX" -> {
                drawRoundRect(
                    color = primaryColor,
                    topLeft = Offset(centerX - radius * 1.02f, centerY - radius * 1.02f),
                    size = Size(radius * 2.04f, radius * 2.04f),
                    cornerRadius = CornerRadius(16.dp.toPx(), 16.dp.toPx()),
                    style = Stroke(width = 4.dp.toPx())
                )
            }
            "NEON_RING" -> {
                // Radiant double neon glow
                drawCircle(
                    color = primaryColor.copy(alpha = 0.4f),
                    radius = radius * 1.05f,
                    style = Stroke(width = 6.dp.toPx())
                )
                drawCircle(
                    color = primaryColor,
                    radius = radius * 1.01f,
                    style = Stroke(width = 3.dp.toPx())
                )
                drawCircle(
                    color = accentColor.copy(alpha = 0.5f),
                    radius = radius * 0.96f,
                    style = Stroke(width = 2.dp.toPx())
                )
            }
        }
    }
}
