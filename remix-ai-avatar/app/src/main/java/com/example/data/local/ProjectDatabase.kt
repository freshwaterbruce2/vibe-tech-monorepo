package com.example.data.local

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

// --- Room Entities ---

@Entity(tableName = "video_projects")
data class VideoProject(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val title: String,
    val niche: String,
    val tone: String,
    val scriptText: String,
    val description: String,
    val tags: String,
    val thumbnailPrompt: String,
    val status: String, // "IDEA", "SCRIPTED", "SCHEDULED", "PUBLISHED"
    val scheduledTimeMillis: Long = 0L,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "custom_avatars")
data class CustomAvatar(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val baseStyle: String, // "TECH_GURU", "COSMIC_GAMER", "WEALTH_MENTOR", "ZEN_COACH"
    val primaryColor: String, // hex value e.g. "#1A73E8"
    val accentColor: String,  // hex value e.g. "#FFD700"
    val bgColor: String,      // hex value e.g. "#121212"
    val frameStyle: String,   // "CIRCULAR", "HEXAGON", "ROUGH_BOX", "NEON_RING"
    val accessory: String,    // "NONE", "GLASSES", "HEADPHONES", "MICROPHONE", "HALO"
    val aiPrompt: String,     // Generation prompt for tools to recreate
    val createdAt: Long = System.currentTimeMillis()
)

// --- DAO Interface ---

@Dao
interface ProjectDao {
    @Query("SELECT * FROM video_projects ORDER BY createdAt DESC")
    fun getAllVideoProjects(): Flow<List<VideoProject>>

    @Query("SELECT * FROM video_projects WHERE status = :status ORDER BY createdAt DESC")
    fun getVideoProjectsByStatus(status: String): Flow<List<VideoProject>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVideoProject(project: VideoProject)

    @Update
    suspend fun updateVideoProject(project: VideoProject)

    @Query("DELETE FROM video_projects WHERE id = :id")
    suspend fun deleteVideoProjectById(id: Int)

    @Query("SELECT * FROM custom_avatars ORDER BY createdAt DESC")
    fun getAllCustomAvatars(): Flow<List<CustomAvatar>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCustomAvatar(avatar: CustomAvatar)

    @Query("DELETE FROM custom_avatars WHERE id = :id")
    suspend fun deleteCustomAvatarById(id: Int)
}

// --- App Database ---

@Database(entities = [VideoProject::class, CustomAvatar::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun projectDao(): ProjectDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "youtube_automation_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}

// --- Repository Class ---

class ProjectRepository(private val projectDao: ProjectDao) {
    val allVideoProjects: Flow<List<VideoProject>> = projectDao.getAllVideoProjects()
    val allCustomAvatars: Flow<List<CustomAvatar>> = projectDao.getAllCustomAvatars()

    fun getVideoProjectsByStatus(status: String): Flow<List<VideoProject>> {
        return projectDao.getVideoProjectsByStatus(status)
    }

    suspend fun insertVideoProject(project: VideoProject) {
        projectDao.insertVideoProject(project)
    }

    suspend fun updateVideoProject(project: VideoProject) {
        projectDao.updateVideoProject(project)
    }

    suspend fun deleteVideoProjectById(id: Int) {
        projectDao.deleteVideoProjectById(id)
    }

    suspend fun insertCustomAvatar(avatar: CustomAvatar) {
        projectDao.insertCustomAvatar(avatar)
    }

    suspend fun deleteCustomAvatarById(id: Int) {
        projectDao.deleteCustomAvatarById(id)
    }
}
