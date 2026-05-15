const { withMainApplication, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withCountdownWidget(config) {
  // 1. Inject WidgetPackage into MainApplication
  config = withMainApplication(config, (cfg) => {
    let content = cfg.modResults.contents;

    // Only patch if not already done
    if (!content.includes('WidgetPackage')) {
      // Add import after package statement
      content = content.replace(
        /^(package com\.ichanliu\.countdowns)/m,
        '$1\nimport com.ichanliu.countdowns.WidgetPackage'
      );

      // Add WidgetPackage() to the packages list
      content = content.replace(
        /PackageList\(this\)\.packages/,
        'PackageList(this).packages.apply { add(WidgetPackage()) }'
      );

      cfg.modResults.contents = content;
    }

    return cfg;
  });

  // 2. Add widget receiver to AndroidManifest
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return cfg;

    const receivers = application.receiver || [];
    const hasWidget = receivers.some((r) => r.$?.['android:name'] === '.CountdownWidget');

    if (!hasWidget) {
      if (!application.receiver) application.receiver = [];
      application.receiver.push({
        $: { 'android:name': '.CountdownWidget', 'android:exported': 'true' },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        }],
        'meta-data': [{
          $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/countdown_widget_info' },
        }],
      });
    }

    return cfg;
  });

  // 3. Copy source and resource files into the Android project
  config = withDangerousMod(config, ['android', async (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const pluginDir = path.join(projectRoot, 'plugins', 'withCountdownWidget');
    const androidRoot = cfg.modRequest.platformProjectRoot;

    // Copy Kotlin sources
    const kotlinSrc = path.join(pluginDir, 'src');
    const kotlinDest = path.join(androidRoot, 'app/src/main/java/com/ichanliu/countdowns');
    if (fs.existsSync(kotlinSrc)) {
      fs.mkdirSync(kotlinDest, { recursive: true });
      for (const f of fs.readdirSync(kotlinSrc)) {
        const src = path.join(kotlinSrc, f);
        if (fs.statSync(src).isFile() && f.endsWith('.kt')) {
          fs.copyFileSync(src, path.join(kotlinDest, f));
        }
      }
    }

    // Copy resource directories (xml/, layout/, drawable/)
    const resSrc = path.join(pluginDir, 'res');
    const resDest = path.join(androidRoot, 'app/src/main/res');
    if (fs.existsSync(resSrc)) {
      copyRecursive(resSrc, resDest);
    }
  }]);

  return config;
}

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

module.exports = withCountdownWidget;
