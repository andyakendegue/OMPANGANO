/**
 * Config plugin : active R8 en release et configure Firebase Crashlytics
 * pour l'upload automatique du fichier de mapping (désobscurcissement).
 *
 * Résout l'avertissement Play Console :
 *   "Aucun fichier de désobscurcissement n'est associé à cet App Bundle."
 *
 * À chaque `expo prebuild`, ce plugin :
 *   1. Active minifyEnabled + shrinkResources dans gradle.properties
 *   2. Ajoute le classpath firebase-crashlytics-gradle dans build.gradle
 *   3. Applique le plugin com.google.firebase.crashlytics dans app/build.gradle
 *   4. Fusionne des règles ProGuard optimisées dans proguard-rules.pro
 *
 * Le plugin Crashlytics uploade mapping.txt vers Firebase après chaque
 * bundleRelease → les traces de plantage sont désobscurcies dans la console.
 * Pour Play Console, importer manuellement :
 *   android/app/build/outputs/mapping/release/mapping.txt
 */

const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withGradleProperties,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const CRASHLYTICS_CLASSPATH =
  "classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.3'";

const CRASHLYTICS_PLUGIN_LINE =
  "apply plugin: 'com.google.firebase.crashlytics'";

const PROGUARD_RULES = `
# ── React Native / Hermes ────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.**

# ── Reanimated ───────────────────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ── Firebase / Crashlytics ───────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ── Expo modules ─────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }

# ── Kotlin coroutines ────────────────────────────────────────────────────────
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
`;

// 1. gradle.properties : active R8 + shrink resources
const withR8GradleProperties = (config) =>
  withGradleProperties(config, (c) => {
    const set = (key, value) => {
      const existing = c.modResults.find((p) => p.key === key);
      if (existing) {
        existing.value = value;
      } else {
        c.modResults.push({ type: 'property', key, value });
      }
    };
    set('android.enableMinifyInReleaseBuilds', 'true');
    set('android.enableShrinkResourcesInReleaseBuilds', 'true');
    return c;
  });

// 2. build.gradle (projet) : classpath Crashlytics
const withCrashlyticsClasspath = (config) =>
  withProjectBuildGradle(config, (c) => {
    if (c.modResults.contents.includes(CRASHLYTICS_CLASSPATH)) return c;
    c.modResults.contents = c.modResults.contents.replace(
      "classpath 'com.google.gms:google-services:",
      `${CRASHLYTICS_CLASSPATH}\n        classpath 'com.google.gms:google-services:`
    );
    return c;
  });

// 3. app/build.gradle : apply plugin Crashlytics
const withCrashlyticsPlugin = (config) =>
  withAppBuildGradle(config, (c) => {
    if (c.modResults.contents.includes(CRASHLYTICS_PLUGIN_LINE)) return c;
    c.modResults.contents = c.modResults.contents.replace(
      "apply plugin: 'com.google.gms.google-services'",
      `apply plugin: 'com.google.gms.google-services'\n${CRASHLYTICS_PLUGIN_LINE}`
    );
    return c;
  });

// 4. proguard-rules.pro : fusionner les règles React Native
const withProguardRules = (config) => {
  // withDangerousMod pour écrire un fichier arbitraire après prebuild
  const { withDangerousMod } = require('@expo/config-plugins');
  return withDangerousMod(config, [
    'android',
    async (c) => {
      const proguardPath = path.join(
        c.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      let existing = '';
      try { existing = fs.readFileSync(proguardPath, 'utf8'); } catch (_) {}
      if (!existing.includes('com.facebook.react')) {
        fs.writeFileSync(proguardPath, existing + PROGUARD_RULES, 'utf8');
      }
      return c;
    },
  ]);
};

module.exports = (config) => {
  config = withR8GradleProperties(config);
  config = withCrashlyticsClasspath(config);
  config = withCrashlyticsPlugin(config);
  config = withProguardRules(config);
  return config;
};
