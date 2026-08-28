# DC8980 Shipping App - ProGuard Rules

# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# React Native and Capacitor optimizations
-dontwarn com.facebook.react.**
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-dontwarn okio.**

# Keep all Capacitor plugin classes
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase rules (if using Firebase)
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep all classes with @Keep annotation
-keep @androidx.annotation.Keep class * {*;}
-keepclassmembers class * {
    @androidx.annotation.Keep *;
}

# For enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Capacitor-specific optimizations
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.PluginManager { *; }
-keep class com.getcapacitor.JSObject { *; }

# Capacitor plugins
-keep class com.capacitorjs.plugins.** { *; }

# WebView optimizations
-keep class android.webkit.** { *; }
-dontwarn android.webkit.**

# Androidx and support library optimizations
-keep class androidx.** { *; }
-dontwarn androidx.**

# Keep all activity classes
-keep class * extends android.app.Activity { *; }
-keep class * extends android.app.Service { *; }
-keep class * extends android.content.BroadcastReceiver { *; }
-keep class * extends android.content.ContentProvider { *; }

# Remove debug logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Optimization settings
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification
-dontpreverify

# Rename packages for better obfuscation
-repackageclasses 'o'
-allowaccessmodification

# Preserve line numbers for debugging stack traces
-keepattributes SourceFile,LineNumberTable

# Hide original source file name in release
-renamesourcefileattribute SourceFile
