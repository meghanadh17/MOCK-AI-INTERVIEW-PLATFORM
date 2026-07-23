$base = "e:\MocrAI\frontend\app\src\main"
$resBase = "$base\res"

function MkFile($path, $content) {
    $dir = Split-Path $path -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Set-Content -Path $path -Value $content -Encoding UTF8
}

# ═══════════════════════════════════════════════════════════
# 1. DELETE values-night (dark only, no theme switching)
# ═══════════════════════════════════════════════════════════
if (Test-Path "$resBase\values-night") {
    Remove-Item -Recurse -Force "$resBase\values-night"
    Write-Host "Deleted values-night/ (dark only)" -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════
# 2. COLORS.XML — Exact match of web CSS tokens
# ═══════════════════════════════════════════════════════════
MkFile "$resBase\values\colors.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!--
        Carbon Void / Zinc Monochrome Palette
        Mirrors web/src/index.css :root tokens exactly
    -->

    <!-- ── Background Scale ── -->
    <color name="bg_void">#030507</color>
    <color name="bg_base">#09090B</color>
    <color name="bg_surface">#0F1117</color>
    <color name="bg_elevated">#18181B</color>
    <color name="bg_overlay">#1C1C21</color>
    <color name="bg_muted">#27272A</color>
    <color name="bg_subtle">#3F3F46</color>

    <!-- ── Text Scale ── -->
    <color name="text_prim">#FAFAFA</color>
    <color name="text_sec">#A1A1AA</color>
    <color name="text_muted">#71717A</color>
    <color name="text_disabled">#3F3F46</color>

    <!-- ── Border Scale ── -->
    <color name="border_subtle">#1A1A1F</color>
    <color name="border_def">#27272A</color>
    <color name="border_strong">#3F3F46</color>
    <color name="border_accent">#52525B</color>

    <!-- ── ShadcnUI Semantic Slots ── -->
    <color name="background">#030507</color>
    <color name="foreground">#FAFAFA</color>
    <color name="card">#0F1117</color>
    <color name="card_foreground">#FAFAFA</color>
    <color name="popover">#1C1C21</color>
    <color name="popover_foreground">#FAFAFA</color>
    <color name="primary">#6366F1</color>
    <color name="primary_foreground">#FAFAFA</color>
    <color name="secondary">#18181B</color>
    <color name="secondary_foreground">#A1A1AA</color>
    <color name="muted">#27272A</color>
    <color name="muted_foreground">#71717A</color>
    <color name="accent">#27272A</color>
    <color name="accent_foreground">#FAFAFA</color>
    <color name="destructive">#EF4444</color>
    <color name="destructive_foreground">#FAFAFA</color>
    <color name="border">#27272A</color>
    <color name="input">#09090B</color>
    <color name="ring">#3B82F6</color>

    <!-- ── Module Accent Colors ── -->
    <color name="color_auth">#3B82F6</color>
    <color name="color_interview">#6366F1</color>
    <color name="color_video">#8B5CF6</color>
    <color name="color_resume">#0EA5E9</color>
    <color name="color_quiz">#10B981</color>
    <color name="color_jobs">#F59E0B</color>
    <color name="color_sessions">#F97316</color>
    <color name="color_profile">#64748B</color>

    <!-- ── Semantic Score Badge Colors ── -->
    <color name="score_high">#10B981</color>
    <color name="score_high_bg">#14352A</color>
    <color name="score_mid">#F59E0B</color>
    <color name="score_mid_bg">#3D2E0A</color>
    <color name="score_low">#EF4444</color>
    <color name="score_low_bg">#3B1414</color>

    <!-- ── Neomorphic Shadow Helpers ── -->
    <color name="neo_shadow_dark">#000000</color>
    <color name="neo_shadow_light">#0A0A0A</color>
    <color name="neo_highlight">#14141A</color>
    <color name="neo_top_edge">#1E1E24</color>

    <!-- ── Ripple / Touch ── -->
    <color name="ripple_dark">#1AFFFFFF</color>
    <color name="ripple_primary">#336366F1</color>

    <!-- ── Transparency Overlays ── -->
    <color name="overlay_50">#80030507</color>
    <color name="overlay_80">#CC030507</color>
    <color name="white_03">#08FFFFFF</color>
    <color name="white_05">#0DFFFFFF</color>
    <color name="white_08">#14FFFFFF</color>
    <color name="white_10">#1AFFFFFF</color>
</resources>
"@

# ═══════════════════════════════════════════════════════════
# 3. THEMES.XML — Dark only, Material3 Dark, no DayNight
# ═══════════════════════════════════════════════════════════
MkFile "$resBase\values\themes.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>

    <!-- Base dark-only theme — NO DayNight, pure void black -->
    <style name="Theme.AiInterview" parent="Theme.Material3.Dark.NoActionBar">
        <!-- Core palette -->
        <item name="colorPrimary">@color/primary</item>
        <item name="colorOnPrimary">@color/primary_foreground</item>
        <item name="colorPrimaryContainer">@color/bg_elevated</item>
        <item name="colorOnPrimaryContainer">@color/text_prim</item>

        <item name="colorSecondary">@color/secondary</item>
        <item name="colorOnSecondary">@color/secondary_foreground</item>
        <item name="colorSecondaryContainer">@color/bg_muted</item>
        <item name="colorOnSecondaryContainer">@color/text_sec</item>

        <item name="colorSurface">@color/bg_surface</item>
        <item name="colorOnSurface">@color/text_prim</item>
        <item name="colorSurfaceVariant">@color/bg_elevated</item>
        <item name="colorOnSurfaceVariant">@color/text_sec</item>
        <item name="colorSurfaceContainerHigh">@color/bg_overlay</item>
        <item name="colorSurfaceContainer">@color/bg_surface</item>
        <item name="colorSurfaceContainerLow">@color/bg_base</item>

        <item name="colorError">@color/destructive</item>
        <item name="colorOnError">@color/destructive_foreground</item>

        <item name="colorOutline">@color/border_def</item>
        <item name="colorOutlineVariant">@color/border_subtle</item>

        <item name="android:colorBackground">@color/bg_void</item>
        <item name="colorOnBackground">@color/text_prim</item>

        <!-- System bars -->
        <item name="android:statusBarColor">@color/bg_void</item>
        <item name="android:navigationBarColor">@color/bg_surface</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>

        <!-- Ripple -->
        <item name="colorControlHighlight">@color/ripple_dark</item>

        <!-- Typography -->
        <item name="fontFamily">@font/ibm_plex_sans_regular</item>

        <!-- Default widget styles -->
        <item name="materialCardViewStyle">@style/Widget.App.Card</item>
        <item name="textInputStyle">@style/Widget.App.TextInput</item>
        <item name="bottomNavigationStyle">@style/Widget.App.BottomNav</item>
        <item name="materialButtonStyle">@style/Widget.App.Button.Primary</item>
        <item name="tabStyle">@style/Widget.App.Tab</item>
    </style>

    <!-- Splash-specific (fully immersive void) -->
    <style name="Theme.AiInterview.Splash" parent="Theme.AiInterview">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
    </style>

</resources>
"@

# ═══════════════════════════════════════════════════════════
# 4. STYLES.XML — Neomorphic Zinc widget overrides
# ═══════════════════════════════════════════════════════════
MkFile "$resBase\values\styles.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>

    <!-- ─── TEXT APPEARANCES ─── -->

    <style name="TextAppearance.App.Display" parent="TextAppearance.Material3.DisplaySmall">
        <item name="fontFamily">@font/dm_sans_extrabold</item>
        <item name="android:textColor">@color/text_prim</item>
        <item name="android:textSize">30sp</item>
        <item name="android:letterSpacing">-0.02</item>
    </style>

    <style name="TextAppearance.App.Heading" parent="TextAppearance.Material3.HeadlineSmall">
        <item name="fontFamily">@font/dm_sans_bold</item>
        <item name="android:textColor">@color/text_prim</item>
        <item name="android:textSize">20sp</item>
        <item name="android:textAllCaps">true</item>
        <item name="android:letterSpacing">-0.01</item>
    </style>

    <style name="TextAppearance.App.Title" parent="TextAppearance.Material3.TitleMedium">
        <item name="fontFamily">@font/dm_sans_bold</item>
        <item name="android:textColor">@color/text_prim</item>
        <item name="android:textSize">16sp</item>
    </style>

    <style name="TextAppearance.App.Body" parent="TextAppearance.Material3.BodyMedium">
        <item name="fontFamily">@font/ibm_plex_sans_regular</item>
        <item name="android:textColor">@color/text_sec</item>
        <item name="android:textSize">14sp</item>
        <item name="android:lineSpacingMultiplier">1.5</item>
    </style>

    <style name="TextAppearance.App.BodySmall" parent="TextAppearance.Material3.BodySmall">
        <item name="fontFamily">@font/ibm_plex_sans_regular</item>
        <item name="android:textColor">@color/text_muted</item>
        <item name="android:textSize">12sp</item>
    </style>

    <style name="TextAppearance.App.Label" parent="TextAppearance.Material3.LabelSmall">
        <item name="fontFamily">@font/ibm_plex_mono_regular</item>
        <item name="android:textColor">@color/text_muted</item>
        <item name="android:textSize">10sp</item>
        <item name="android:textAllCaps">true</item>
        <item name="android:letterSpacing">0.08</item>
    </style>

    <style name="TextAppearance.App.Mono" parent="TextAppearance.Material3.LabelMedium">
        <item name="fontFamily">@font/ibm_plex_mono_bold</item>
        <item name="android:textColor">@color/text_sec</item>
        <item name="android:textSize">12sp</item>
        <item name="android:textAllCaps">true</item>
        <item name="android:letterSpacing">0.06</item>
    </style>

    <!-- ─── WIDGET OVERRIDES ─── -->

    <!-- Neomorphic Raised Card -->
    <style name="Widget.App.Card" parent="Widget.Material3.CardView.Filled">
        <item name="cardBackgroundColor">@color/bg_surface</item>
        <item name="cardCornerRadius">@dimen/radius_lg</item>
        <item name="strokeColor">@color/white_03</item>
        <item name="strokeWidth">1dp</item>
        <item name="cardElevation">8dp</item>
        <item name="contentPadding">16dp</item>
        <item name="android:foreground">?attr/selectableItemBackground</item>
    </style>

    <!-- Neomorphic Raised Card — Interactive (hoverable) -->
    <style name="Widget.App.Card.Interactive" parent="Widget.App.Card">
        <item name="android:foreground">?attr/selectableItemBackground</item>
        <item name="android:clickable">true</item>
        <item name="android:focusable">true</item>
        <item name="cardElevation">10dp</item>
    </style>

    <!-- Sunken / Inset Panel Card -->
    <style name="Widget.App.Card.Sunken" parent="Widget.Material3.CardView.Filled">
        <item name="cardBackgroundColor">@color/bg_base</item>
        <item name="cardCornerRadius">@dimen/radius_lg</item>
        <item name="strokeColor">@color/border_subtle</item>
        <item name="strokeWidth">1dp</item>
        <item name="cardElevation">0dp</item>
        <item name="contentPadding">16dp</item>
    </style>

    <!-- Primary CTA Button — light zinc (matches web bg-zinc-100) -->
    <style name="Widget.App.Button.Primary" parent="Widget.Material3.Button">
        <item name="backgroundTint">@color/primary</item>
        <item name="android:textColor">@color/primary_foreground</item>
        <item name="cornerRadius">@dimen/radius_lg</item>
        <item name="android:fontFamily">@font/dm_sans_bold</item>
        <item name="android:textSize">12sp</item>
        <item name="android:textAllCaps">true</item>
        <item name="android:letterSpacing">0.04</item>
        <item name="android:minHeight">48dp</item>
        <item name="android:paddingStart">24dp</item>
        <item name="android:paddingEnd">24dp</item>
        <item name="rippleColor">@color/ripple_primary</item>
    </style>

    <!-- Ghost / Outline Button -->
    <style name="Widget.App.Button.Ghost" parent="Widget.Material3.Button.TextButton">
        <item name="android:textColor">@color/text_sec</item>
        <item name="cornerRadius">@dimen/radius_lg</item>
        <item name="android:fontFamily">@font/ibm_plex_sans_medium</item>
        <item name="android:textSize">12sp</item>
        <item name="android:textAllCaps">true</item>
        <item name="android:letterSpacing">0.04</item>
        <item name="rippleColor">@color/ripple_dark</item>
    </style>

    <!-- Neomorphic Outline Button -->
    <style name="Widget.App.Button.Outline" parent="Widget.Material3.Button.OutlinedButton">
        <item name="backgroundTint">@android:color/transparent</item>
        <item name="strokeColor">@color/border_def</item>
        <item name="strokeWidth">1dp</item>
        <item name="android:textColor">@color/text_prim</item>
        <item name="cornerRadius">@dimen/radius_lg</item>
        <item name="android:fontFamily">@font/dm_sans_bold</item>
        <item name="android:textSize">12sp</item>
        <item name="android:textAllCaps">true</item>
        <item name="rippleColor">@color/ripple_dark</item>
    </style>

    <!-- Zinc Tactile Light Button (Premium CTA) -->
    <style name="Widget.App.Button.Zinc" parent="Widget.Material3.Button">
        <item name="backgroundTint">#F4F4F5</item>
        <item name="android:textColor">#09090B</item>
        <item name="cornerRadius">@dimen/radius_lg</item>
        <item name="android:fontFamily">@font/dm_sans_extrabold</item>
        <item name="android:textSize">10sp</item>
        <item name="android:textAllCaps">true</item>
        <item name="android:letterSpacing">0.06</item>
        <item name="android:minHeight">44dp</item>
    </style>

    <!-- Text Input (sunken) -->
    <style name="Widget.App.TextInput" parent="Widget.Material3.TextInputLayout.OutlinedBox">
        <item name="boxBackgroundMode">filled</item>
        <item name="boxBackgroundColor">@color/bg_base</item>
        <item name="boxStrokeColor">@color/border_subtle</item>
        <item name="boxStrokeWidth">1dp</item>
        <item name="boxStrokeWidthFocused">1dp</item>
        <item name="boxCornerRadiusTopStart">@dimen/radius_lg</item>
        <item name="boxCornerRadiusTopEnd">@dimen/radius_lg</item>
        <item name="boxCornerRadiusBottomStart">@dimen/radius_lg</item>
        <item name="boxCornerRadiusBottomEnd">@dimen/radius_lg</item>
        <item name="hintTextColor">@color/text_muted</item>
        <item name="android:textColorHint">@color/text_muted</item>
    </style>

    <!-- Bottom Navigation -->
    <style name="Widget.App.BottomNav" parent="Widget.Material3.BottomNavigationView">
        <item name="backgroundTint">@color/bg_surface</item>
        <item name="itemIconTint">@color/bottom_nav_icon_tint</item>
        <item name="itemTextColor">@color/bottom_nav_icon_tint</item>
        <item name="itemRippleColor">@color/ripple_dark</item>
        <item name="labelVisibilityMode">labeled</item>
        <item name="android:elevation">0dp</item>
    </style>

    <!-- Tabs -->
    <style name="Widget.App.Tab" parent="Widget.Material3.TabLayout">
        <item name="tabBackground">@android:color/transparent</item>
        <item name="tabIndicatorColor">@color/primary</item>
        <item name="tabIndicatorHeight">2dp</item>
        <item name="tabSelectedTextColor">@color/text_prim</item>
        <item name="tabTextColor">@color/text_muted</item>
        <item name="tabTextAppearance">@style/TextAppearance.App.Mono</item>
        <item name="tabRippleColor">@color/ripple_dark</item>
    </style>

    <!-- Chip -->
    <style name="Widget.App.Chip" parent="Widget.Material3.Chip.Filter">
        <item name="chipBackgroundColor">@color/bg_elevated</item>
        <item name="chipStrokeColor">@color/border_def</item>
        <item name="chipStrokeWidth">1dp</item>
        <item name="chipCornerRadius">@dimen/radius_md</item>
        <item name="android:textColor">@color/text_sec</item>
        <item name="chipMinHeight">28dp</item>
    </style>

    <!-- Divider -->
    <style name="Widget.App.Divider">
        <item name="android:layout_width">match_parent</item>
        <item name="android:layout_height">1dp</item>
        <item name="android:background">@color/border_subtle</item>
    </style>

</resources>
"@

# ═══════════════════════════════════════════════════════════
# 5. DIMENS.XML — Match web spacing/radius scale
# ═══════════════════════════════════════════════════════════
MkFile "$resBase\values\dimens.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- 4dp base spacing scale (matches web 4px/8px grid) -->
    <dimen name="spacing_xxs">2dp</dimen>
    <dimen name="spacing_xs">4dp</dimen>
    <dimen name="spacing_sm">8dp</dimen>
    <dimen name="spacing_md">16dp</dimen>
    <dimen name="spacing_lg">24dp</dimen>
    <dimen name="spacing_xl">32dp</dimen>
    <dimen name="spacing_2xl">48dp</dimen>
    <dimen name="spacing_3xl">64dp</dimen>

    <!-- Border radius scale (matches web --radius-*) -->
    <dimen name="radius_sm">4dp</dimen>
    <dimen name="radius_md">8dp</dimen>
    <dimen name="radius_lg">12dp</dimen>
    <dimen name="radius_xl">16dp</dimen>
    <dimen name="radius_2xl">20dp</dimen>

    <!-- Text sizes -->
    <dimen name="text_xxs">9sp</dimen>
    <dimen name="text_xs">10sp</dimen>
    <dimen name="text_sm">12sp</dimen>
    <dimen name="text_md">14sp</dimen>
    <dimen name="text_lg">16sp</dimen>
    <dimen name="text_xl">20sp</dimen>
    <dimen name="text_2xl">24sp</dimen>
    <dimen name="text_3xl">30sp</dimen>

    <!-- Component heights -->
    <dimen name="button_height">48dp</dimen>
    <dimen name="input_height">48dp</dimen>
    <dimen name="toolbar_height">56dp</dimen>
    <dimen name="bottom_nav_height">64dp</dimen>
    <dimen name="card_icon_size">40dp</dimen>
    <dimen name="avatar_size">40dp</dimen>
    <dimen name="avatar_large">56dp</dimen>
</resources>
"@

# ═══════════════════════════════════════════════════════════
# 6. Bottom Nav Color State List
# ═══════════════════════════════════════════════════════════
MkFile "$resBase\color\bottom_nav_icon_tint.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:color="@color/text_prim" android:state_checked="true" />
    <item android:color="@color/text_disabled" />
</selector>
"@

# ═══════════════════════════════════════════════════════════
# 7. DRAWABLES — Neomorphic shapes matching web
# ═══════════════════════════════════════════════════════════

# Neo-raised card shape
MkFile "$resBase\drawable\bg_card_dark.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Base card fill -->
    <item>
        <shape android:shape="rectangle">
            <solid android:color="@color/bg_surface" />
            <corners android:radius="@dimen/radius_lg" />
            <stroke android:width="1dp" android:color="@color/white_03" />
        </shape>
    </item>
    <!-- Top-edge highlight (mimics neo-raised inset 0 1px highlight) -->
    <item android:top="0dp" android:bottom="-1dp" android:left="4dp" android:right="4dp">
        <shape android:shape="rectangle">
            <size android:height="1dp" />
            <solid android:color="@color/white_05" />
            <corners android:topLeftRadius="@dimen/radius_lg" android:topRightRadius="@dimen/radius_lg" />
        </shape>
    </item>
</layer-list>
"@

# Sunken input background (neo-sunken)
MkFile "$resBase\drawable\bg_input_dark.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/bg_base" />
    <corners android:radius="@dimen/radius_lg" />
    <stroke android:width="1dp" android:color="@color/border_subtle" />
</shape>
"@

# Elevated card (slightly raised from surface)
MkFile "$resBase\drawable\bg_card_elevated.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/bg_elevated" />
    <corners android:radius="@dimen/radius_lg" />
    <stroke android:width="1dp" android:color="@color/border_def" />
</shape>
"@

# Overlay/popover card
MkFile "$resBase\drawable\bg_card_overlay.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/bg_overlay" />
    <corners android:radius="@dimen/radius_xl" />
    <stroke android:width="1dp" android:color="@color/border_def" />
</shape>
"@

# Score badge background
MkFile "$resBase\drawable\shape_score_badge.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/bg_elevated" />
    <corners android:radius="@dimen/radius_md" />
    <padding android:left="10dp" android:top="4dp" android:right="10dp" android:bottom="4dp" />
</shape>
"@

# Pill badge (mono label)
MkFile "$resBase\drawable\shape_pill_badge.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/bg_muted" />
    <corners android:radius="100dp" />
    <padding android:left="12dp" android:top="4dp" android:right="12dp" android:bottom="4dp" />
</shape>
"@

# Chip shape
MkFile "$resBase\drawable\shape_chip.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/bg_elevated" />
    <corners android:radius="@dimen/radius_md" />
    <stroke android:width="1dp" android:color="@color/border_def" />
    <padding android:left="10dp" android:top="6dp" android:right="10dp" android:bottom="6dp" />
</shape>
"@

# Neomorphic button shape (raised)
MkFile "$resBase\drawable\bg_button_neo.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<ripple xmlns:android="http://schemas.android.com/apk/res/android" android:color="@color/ripple_dark">
    <item>
        <shape android:shape="rectangle">
            <solid android:color="@color/bg_surface" />
            <corners android:radius="@dimen/radius_lg" />
            <stroke android:width="1dp" android:color="@color/white_03" />
        </shape>
    </item>
</ripple>
"@

# Primary button shape
MkFile "$resBase\drawable\bg_button_primary.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<ripple xmlns:android="http://schemas.android.com/apk/res/android" android:color="@color/ripple_primary">
    <item>
        <shape android:shape="rectangle">
            <solid android:color="@color/primary" />
            <corners android:radius="@dimen/radius_lg" />
        </shape>
    </item>
</ripple>
"@

# Zinc Light CTA button (matches web bg-zinc-100 hover:bg-white text-zinc-950)
MkFile "$resBase\drawable\bg_button_zinc.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<ripple xmlns:android="http://schemas.android.com/apk/res/android" android:color="#33000000">
    <item>
        <shape android:shape="rectangle">
            <solid android:color="#F4F4F5" />
            <corners android:radius="@dimen/radius_lg" />
        </shape>
    </item>
</ripple>
"@

# Divider line
MkFile "$resBase\drawable\divider_subtle.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/border_subtle" />
    <size android:height="1dp" />
</shape>
"@

# Bottom navigation top border
MkFile "$resBase\drawable\bg_bottom_nav.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape android:shape="rectangle">
            <solid android:color="@color/bg_surface" />
        </shape>
    </item>
    <item android:bottom="-1dp" android:left="0dp" android:right="0dp">
        <shape android:shape="rectangle">
            <size android:height="1dp" />
            <solid android:color="@color/border_subtle" />
        </shape>
    </item>
</layer-list>
"@

# Module gradients — keep as-is (already correct)
$gradients = @{
    "gradient_auth"      = @("#3B82F6", "#1E40AF")
    "gradient_interview" = @("#6366F1", "#4338CA")
    "gradient_video"     = @("#8B5CF6", "#6D28D9")
    "gradient_resume"    = @("#0EA5E9", "#0369A1")
    "gradient_quiz"      = @("#10B981", "#047857")
    "gradient_jobs"      = @("#F59E0B", "#B45309")
    "gradient_sessions"  = @("#F97316", "#C2410C")
}
foreach ($gName in $gradients.Keys) {
    $colors = $gradients[$gName]
    MkFile "$resBase\drawable\$gName.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient android:startColor="$($colors[0])" android:endColor="$($colors[1])" android:angle="135" />
    <corners android:radius="@dimen/radius_lg" />
</shape>
"@
}

Write-Host "Drawables updated." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# 8. LAYOUTS — Full dark zinc monochrome UI
# ═══════════════════════════════════════════════════════════

# ─── activity_main.xml ────────────────────────────────────
MkFile "$resBase\layout\activity_main.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void">

    <androidx.fragment.app.FragmentContainerView
        android:id="@+id/nav_host_fragment"
        android:name="androidx.navigation.fragment.NavHostFragment"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toTopOf="@id/divider_nav"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:defaultNavHost="true"
        app:navGraph="@navigation/nav_graph" />

    <!-- Subtle top border above nav -->
    <View
        android:id="@+id/divider_nav"
        android:layout_width="0dp"
        android:layout_height="1dp"
        android:background="@color/border_subtle"
        app:layout_constraintBottom_toTopOf="@id/bottom_nav"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <com.google.android.material.bottomnavigation.BottomNavigationView
        android:id="@+id/bottom_nav"
        android:layout_width="0dp"
        android:layout_height="@dimen/bottom_nav_height"
        android:background="@color/bg_surface"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:menu="@menu/bottom_nav_menu"
        app:labelVisibilityMode="labeled"
        app:elevation="0dp"
        app:itemIconTint="@color/bottom_nav_icon_tint"
        app:itemTextColor="@color/bottom_nav_icon_tint"
        app:itemRippleColor="@color/ripple_dark" />

</androidx.constraintlayout.widget.ConstraintLayout>
"@

# ─── fragment_splash.xml ──────────────────────────────────
MkFile "$resBase\layout\fragment_splash.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void">

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center"
        android:gravity="center"
        android:orientation="vertical">

        <ImageView
            android:id="@+id/iv_logo"
            android:layout_width="72dp"
            android:layout_height="72dp"
            android:src="@drawable/ic_interview"
            android:importantForAccessibility="no" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_md"
            android:text="@string/app_name"
            android:textAppearance="@style/TextAppearance.App.Display"
            android:textColor="@color/text_prim" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_xs"
            android:text="AI Interview \u0026 Resume Coach"
            android:textAppearance="@style/TextAppearance.App.Label"
            android:textColor="@color/text_muted" />
    </LinearLayout>

    <ProgressBar
        android:id="@+id/progress_splash"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="160dp"
        android:layout_height="2dp"
        android:layout_gravity="center_horizontal|bottom"
        android:layout_marginBottom="80dp"
        android:indeterminate="true"
        android:indeterminateTint="@color/primary" />

</FrameLayout>
"@

# ─── fragment_login.xml ───────────────────────────────────
MkFile "$resBase\layout\fragment_login.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<ScrollView xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:fillViewport="true"
    android:background="@color/bg_void"
    android:scrollbars="none">

    <androidx.constraintlayout.widget.ConstraintLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:padding="@dimen/spacing_lg">

        <!-- Mono breadcrumb -->
        <TextView
            android:id="@+id/tv_breadcrumb"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_3xl"
            android:text="AUTH · SIGN IN"
            android:textAppearance="@style/TextAppearance.App.Label"
            app:layout_constraintTop_toTopOf="parent"
            app:layout_constraintStart_toStartOf="parent" />

        <TextView
            android:id="@+id/tv_heading"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_sm"
            android:text="Welcome Back"
            android:textAppearance="@style/TextAppearance.App.Display"
            app:layout_constraintTop_toBottomOf="@id/tv_breadcrumb"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintEnd_toEndOf="parent" />

        <TextView
            android:id="@+id/tv_subtitle"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_xs"
            android:text="Sign in to continue your AI-powered interview preparation"
            android:textAppearance="@style/TextAppearance.App.Body"
            android:textColor="@color/text_muted"
            app:layout_constraintTop_toBottomOf="@id/tv_heading"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintEnd_toEndOf="parent" />

        <!-- Login form card (neo-raised) -->
        <com.google.android.material.card.MaterialCardView
            android:id="@+id/card_form"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_xl"
            style="@style/Widget.App.Card"
            app:layout_constraintTop_toBottomOf="@id/tv_subtitle"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintEnd_toEndOf="parent">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical">

                <com.google.android.material.textfield.TextInputLayout
                    android:id="@+id/til_email"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    style="@style/Widget.App.TextInput"
                    android:hint="@string/email_hint">
                    <com.google.android.material.textfield.TextInputEditText
                        android:id="@+id/et_email"
                        android:layout_width="match_parent"
                        android:layout_height="@dimen/input_height"
                        android:inputType="textEmailAddress"
                        android:textColor="@color/text_prim"
                        android:textSize="@dimen/text_md" />
                </com.google.android.material.textfield.TextInputLayout>

                <com.google.android.material.textfield.TextInputLayout
                    android:id="@+id/til_password"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="@dimen/spacing_md"
                    style="@style/Widget.App.TextInput"
                    android:hint="@string/password_hint"
                    app:endIconMode="password_toggle">
                    <com.google.android.material.textfield.TextInputEditText
                        android:id="@+id/et_password"
                        android:layout_width="match_parent"
                        android:layout_height="@dimen/input_height"
                        android:inputType="textPassword"
                        android:textColor="@color/text_prim"
                        android:textSize="@dimen/text_md" />
                </com.google.android.material.textfield.TextInputLayout>

                <TextView
                    android:id="@+id/tv_forgot"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_gravity="end"
                    android:layout_marginTop="@dimen/spacing_sm"
                    android:text="@string/forgot_password"
                    android:textAppearance="@style/TextAppearance.App.BodySmall"
                    android:textColor="@color/primary"
                    android:clickable="true"
                    android:focusable="true" />

                <com.google.android.material.button.MaterialButton
                    android:id="@+id/btn_login"
                    android:layout_width="match_parent"
                    android:layout_height="@dimen/button_height"
                    android:layout_marginTop="@dimen/spacing_lg"
                    android:text="@string/login"
                    style="@style/Widget.App.Button.Primary" />

            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Register link -->
        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_lg"
            android:gravity="center"
            android:orientation="horizontal"
            app:layout_constraintTop_toBottomOf="@id/card_form"
            app:layout_constraintStart_toStartOf="parent"
            app:layout_constraintEnd_toEndOf="parent">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Don\u0027t have an account? "
                android:textAppearance="@style/TextAppearance.App.BodySmall" />

            <TextView
                android:id="@+id/tv_register_link"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="@string/register"
                android:textAppearance="@style/TextAppearance.App.BodySmall"
                android:textColor="@color/primary"
                android:textStyle="bold"
                android:clickable="true"
                android:focusable="true" />
        </LinearLayout>

    </androidx.constraintlayout.widget.ConstraintLayout>
</ScrollView>
"@

# ─── fragment_home.xml ────────────────────────────────────
MkFile "$resBase\layout\fragment_home.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<androidx.core.widget.NestedScrollView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void"
    android:scrollbars="none"
    android:fillViewport="true">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="@dimen/spacing_md">

        <!-- Greeting header -->
        <TextView
            android:id="@+id/tv_breadcrumb"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="DASHBOARD"
            android:textAppearance="@style/TextAppearance.App.Label" />

        <TextView
            android:id="@+id/tv_greeting"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_xs"
            android:text="Welcome back"
            android:textAppearance="@style/TextAppearance.App.Heading" />

        <!-- Quick action cards grid -->
        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_lg"
            android:text="QUICK ACTIONS"
            android:textAppearance="@style/TextAppearance.App.Label" />

        <androidx.recyclerview.widget.RecyclerView
            android:id="@+id/rv_quick_actions"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_sm"
            android:clipToPadding="false"
            android:overScrollMode="never" />

        <!-- Recent sessions -->
        <View
            android:layout_width="match_parent"
            android:layout_height="1dp"
            android:layout_marginVertical="@dimen/spacing_lg"
            android:background="@color/border_subtle" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="RECENT SESSIONS"
            android:textAppearance="@style/TextAppearance.App.Label" />

        <androidx.recyclerview.widget.RecyclerView
            android:id="@+id/rv_recent_sessions"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_sm"
            android:nestedScrollingEnabled="false"
            android:overScrollMode="never" />

        <!-- Job highlights -->
        <View
            android:layout_width="match_parent"
            android:layout_height="1dp"
            android:layout_marginVertical="@dimen/spacing_lg"
            android:background="@color/border_subtle" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="JOB HIGHLIGHTS"
            android:textAppearance="@style/TextAppearance.App.Label" />

        <androidx.recyclerview.widget.RecyclerView
            android:id="@+id/rv_job_highlights"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_sm"
            android:clipToPadding="false"
            android:overScrollMode="never" />

    </LinearLayout>
</androidx.core.widget.NestedScrollView>
"@

# ─── fragment_register / onboarding / forgot / otp — simple dark shells ───
$authShells = @{
    "fragment_register" = @{ Title="Create Account"; Breadcrumb="AUTH · REGISTER"; Desc="Join MockAI and start your AI interview preparation journey" }
    "fragment_onboarding" = @{ Title="Get Started"; Breadcrumb="ONBOARDING"; Desc="Swipe through to discover MockAI features" }
    "fragment_forgot_password" = @{ Title="Reset Password"; Breadcrumb="AUTH · RESET"; Desc="Enter your email to receive a password reset code" }
    "fragment_otp_verification" = @{ Title="Verify Code"; Breadcrumb="AUTH · VERIFICATION"; Desc="Enter the 6-digit verification code sent to your email" }
}
foreach ($name in $authShells.Keys) {
    $s = $authShells[$name]
    MkFile "$resBase\layout\$name.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<ScrollView xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void"
    android:fillViewport="true"
    android:scrollbars="none">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="@dimen/spacing_lg">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_3xl"
            android:text="$($s.Breadcrumb)"
            android:textAppearance="@style/TextAppearance.App.Label" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_sm"
            android:text="$($s.Title)"
            android:textAppearance="@style/TextAppearance.App.Display" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_xs"
            android:text="$($s.Desc)"
            android:textAppearance="@style/TextAppearance.App.Body"
            android:textColor="@color/text_muted" />

        <com.google.android.material.card.MaterialCardView
            android:id="@+id/card_content"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_xl"
            style="@style/Widget.App.Card">

            <LinearLayout
                android:id="@+id/content_container"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical" />

        </com.google.android.material.card.MaterialCardView>
    </LinearLayout>
</ScrollView>
"@
}

Write-Host "Auth layouts updated." -ForegroundColor Green

# ─── Feature page layouts (neo-raised pattern) ────────────
# Template for scrollable feature pages
function FeaturePageLayout($breadcrumb, $title, $contentId) {
@"
<?xml version="1.0" encoding="utf-8"?>
<androidx.core.widget.NestedScrollView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void"
    android:scrollbars="none"
    android:fillViewport="true">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="@dimen/spacing_md">

        <!-- Header row -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical">

            <ImageButton
                android:id="@+id/btn_back"
                android:layout_width="@dimen/card_icon_size"
                android:layout_height="@dimen/card_icon_size"
                android:background="@drawable/bg_button_neo"
                android:src="@drawable/ic_arrow_back"
                android:scaleType="center"
                android:contentDescription="Back"
                app:tint="@color/text_muted" />

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:layout_marginStart="@dimen/spacing_md"
                android:orientation="vertical">

                <TextView
                    android:id="@+id/tv_breadcrumb"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="$breadcrumb"
                    android:textAppearance="@style/TextAppearance.App.Label" />

                <TextView
                    android:id="@+id/tv_title"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="2dp"
                    android:text="$title"
                    android:textAppearance="@style/TextAppearance.App.Heading"
                    android:singleLine="true"
                    android:ellipsize="end" />
            </LinearLayout>
        </LinearLayout>

        <!-- Divider -->
        <View
            android:layout_width="match_parent"
            android:layout_height="1dp"
            android:layout_marginVertical="@dimen/spacing_md"
            android:background="@color/border_subtle" />

        <!-- Main content container -->
        <LinearLayout
            android:id="@+id/$contentId"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical" />

    </LinearLayout>
</androidx.core.widget.NestedScrollView>
"@
}

# Template for list-based feature pages (with tabs/filters)
function FeatureListLayout($breadcrumb, $title, $rvId, $extraHeaderContent) {
@"
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@color/bg_void">

    <!-- Fixed header -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:paddingHorizontal="@dimen/spacing_md"
        android:paddingTop="@dimen/spacing_md">

        <TextView
            android:id="@+id/tv_breadcrumb"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="$breadcrumb"
            android:textAppearance="@style/TextAppearance.App.Label" />

        <TextView
            android:id="@+id/tv_title"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_xs"
            android:text="$title"
            android:textAppearance="@style/TextAppearance.App.Heading" />

        $extraHeaderContent

        <View
            android:layout_width="match_parent"
            android:layout_height="1dp"
            android:layout_marginTop="@dimen/spacing_md"
            android:background="@color/border_subtle" />
    </LinearLayout>

    <!-- Scrollable list -->
    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/$rvId"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:paddingHorizontal="@dimen/spacing_md"
        android:paddingTop="@dimen/spacing_sm"
        android:paddingBottom="@dimen/spacing_md"
        android:clipToPadding="false"
        android:scrollbars="none"
        android:overScrollMode="never" />

    <!-- Loading overlay -->
    <include layout="@layout/layout_loading_overlay" />

</LinearLayout>
"@
}

# Resume pages
MkFile "$resBase\layout\fragment_resume_list.xml" (FeatureListLayout "RESUME · VAULT" "My Resumes" "rv_resumes" @"

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btn_upload"
            android:layout_width="match_parent"
            android:layout_height="@dimen/button_height"
            android:layout_marginTop="@dimen/spacing_md"
            android:text="@string/upload_resume"
            style="@style/Widget.App.Button.Zinc"
            app:icon="@drawable/ic_upload"
            app:iconGravity="textStart" />
"@)

MkFile "$resBase\layout\fragment_resume_upload.xml" (FeaturePageLayout "RESUME · UPLOAD" "Upload Resume" "content_upload")
MkFile "$resBase\layout\fragment_resume_detail.xml" (FeaturePageLayout "RESUME · DETAIL" "Resume Analysis" "content_detail")
MkFile "$resBase\layout\fragment_resume_analysis.xml" (FeaturePageLayout "RESUME · AI ANALYSIS" "Analysis Report" "content_analysis")

# Interview pages
MkFile "$resBase\layout\fragment_interview_setup.xml" (FeaturePageLayout "INTERVIEW · SETUP" "New Session" "content_setup")

MkFile "$resBase\layout\fragment_interview_session.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void"
    android:padding="@dimen/spacing_md">

    <!-- Top bar: timer + progress -->
    <com.google.android.material.card.MaterialCardView
        android:id="@+id/card_timer"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        style="@style/Widget.App.Card"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center_vertical"
            android:orientation="horizontal">

            <TextView
                android:id="@+id/tv_question_progress"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="Q 1/10"
                android:textAppearance="@style/TextAppearance.App.Mono"
                android:textColor="@color/text_sec" />

            <TextView
                android:id="@+id/tv_timer"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:background="@drawable/shape_pill_badge"
                android:text="00:00"
                android:textAppearance="@style/TextAppearance.App.Mono"
                android:textColor="@color/text_prim" />
        </LinearLayout>
    </com.google.android.material.card.MaterialCardView>

    <!-- Question card -->
    <com.google.android.material.card.MaterialCardView
        android:id="@+id/card_question"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_marginTop="@dimen/spacing_md"
        style="@style/Widget.App.Card"
        app:layout_constraintTop_toBottomOf="@id/card_timer"
        app:layout_constraintBottom_toTopOf="@id/card_answer"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent">

        <ScrollView
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:scrollbars="none">

            <TextView
                android:id="@+id/tv_question"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:textAppearance="@style/TextAppearance.App.Body"
                android:textColor="@color/text_prim"
                android:textSize="@dimen/text_lg"
                android:lineSpacingMultiplier="1.6" />
        </ScrollView>
    </com.google.android.material.card.MaterialCardView>

    <!-- Answer input area -->
    <com.google.android.material.card.MaterialCardView
        android:id="@+id/card_answer"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        style="@style/Widget.App.Card.Sunken"
        app:layout_constraintBottom_toTopOf="@id/ll_actions"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginTop="@dimen/spacing_sm">

        <EditText
            android:id="@+id/et_answer"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:minHeight="100dp"
            android:background="@null"
            android:gravity="top|start"
            android:hint="Type your answer here..."
            android:inputType="textMultiLine"
            android:textAppearance="@style/TextAppearance.App.Body"
            android:textColor="@color/text_prim"
            android:textColorHint="@color/text_disabled" />

    </com.google.android.material.card.MaterialCardView>

    <!-- Action bar -->
    <LinearLayout
        android:id="@+id/ll_actions"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_marginTop="@dimen/spacing_sm"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent">

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btn_hint"
            android:layout_width="wrap_content"
            android:layout_height="@dimen/button_height"
            android:text="@string/get_hint"
            style="@style/Widget.App.Button.Ghost"
            app:icon="@drawable/ic_hint"
            app:iconGravity="textStart" />

        <View
            android:layout_width="0dp"
            android:layout_height="0dp"
            android:layout_weight="1" />

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btn_submit"
            android:layout_width="wrap_content"
            android:layout_height="@dimen/button_height"
            android:text="@string/submit_answer"
            style="@style/Widget.App.Button.Zinc" />
    </LinearLayout>

    <include layout="@layout/layout_loading_overlay" />

</androidx.constraintlayout.widget.ConstraintLayout>
"@

MkFile "$resBase\layout\fragment_interview_report.xml" (FeaturePageLayout "INTERVIEW · REPORT" "Session Report" "content_report")
MkFile "$resBase\layout\fragment_question_bank.xml" (FeatureListLayout "INTERVIEW · BANK" "Question Bank" "rv_questions" "")

# Video pages
MkFile "$resBase\layout\fragment_video_setup.xml" (FeaturePageLayout "VIDEO · SETUP" "Video Interview" "content_setup")

MkFile "$resBase\layout\fragment_video_interview.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void">

    <!-- Camera preview -->
    <androidx.camera.view.PreviewView
        android:id="@+id/camera_preview"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toTopOf="@id/card_controls"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <!-- Emotion overlay badge -->
    <TextView
        android:id="@+id/tv_emotion"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_margin="@dimen/spacing_md"
        android:background="@drawable/shape_pill_badge"
        android:text="Neutral"
        android:textAppearance="@style/TextAppearance.App.Label"
        android:textColor="@color/text_prim"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

    <!-- Controls panel -->
    <com.google.android.material.card.MaterialCardView
        android:id="@+id/card_controls"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        style="@style/Widget.App.Card"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:cardCornerRadius="0dp">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center"
            android:orientation="horizontal"
            android:padding="@dimen/spacing_md">

            <ImageButton
                android:id="@+id/btn_mic"
                android:layout_width="56dp"
                android:layout_height="56dp"
                android:background="@drawable/bg_button_neo"
                android:src="@drawable/ic_mic"
                android:scaleType="center"
                android:contentDescription="Toggle microphone"
                app:tint="@color/text_prim" />

            <ImageButton
                android:id="@+id/btn_record"
                android:layout_width="64dp"
                android:layout_height="64dp"
                android:layout_marginHorizontal="@dimen/spacing_xl"
                android:background="@drawable/bg_button_primary"
                android:src="@drawable/ic_camera"
                android:scaleType="center"
                android:contentDescription="Record"
                app:tint="@color/primary_foreground" />

            <ImageButton
                android:id="@+id/btn_stop"
                android:layout_width="56dp"
                android:layout_height="56dp"
                android:background="@drawable/bg_button_neo"
                android:src="@drawable/ic_stop"
                android:scaleType="center"
                android:contentDescription="Stop"
                app:tint="@color/destructive" />
        </LinearLayout>
    </com.google.android.material.card.MaterialCardView>

</androidx.constraintlayout.widget.ConstraintLayout>
"@

MkFile "$resBase\layout\fragment_video_report.xml" (FeaturePageLayout "VIDEO · REPORT" "Video Analysis" "content_report")
MkFile "$resBase\layout\fragment_video_playback.xml" (FeaturePageLayout "VIDEO · PLAYBACK" "Recording" "content_playback")

# Session pages
MkFile "$resBase\layout\fragment_session_history.xml" (FeatureListLayout "SESSIONS" "Session History" "rv_sessions" "")
MkFile "$resBase\layout\fragment_session_detail.xml" (FeaturePageLayout "SESSION · DETAIL" "Session Review" "content_detail")
MkFile "$resBase\layout\fragment_progress.xml" (FeaturePageLayout "SESSIONS · PROGRESS" "Your Progress" "content_progress")

# Quiz pages
MkFile "$resBase\layout\fragment_quiz_home.xml" (FeatureListLayout "QUIZ · ARENA" "Quiz Arena" "rv_quizzes" @"

        <!-- Quiz controls card -->
        <com.google.android.material.card.MaterialCardView
            android:id="@+id/card_generate"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_md"
            style="@style/Widget.App.Card">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="AI QUIZ GENERATOR"
                    android:textAppearance="@style/TextAppearance.App.Label" />

                <com.google.android.material.textfield.TextInputLayout
                    android:id="@+id/til_topic"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="@dimen/spacing_sm"
                    style="@style/Widget.App.TextInput"
                    android:hint="Topic (e.g. React, System Design)">
                    <com.google.android.material.textfield.TextInputEditText
                        android:id="@+id/et_topic"
                        android:layout_width="match_parent"
                        android:layout_height="@dimen/input_height"
                        android:textColor="@color/text_prim" />
                </com.google.android.material.textfield.TextInputLayout>

                <com.google.android.material.button.MaterialButton
                    android:id="@+id/btn_generate"
                    android:layout_width="match_parent"
                    android:layout_height="@dimen/button_height"
                    android:layout_marginTop="@dimen/spacing_md"
                    android:text="Generate Quiz"
                    style="@style/Widget.App.Button.Zinc" />

            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>
"@)

MkFile "$resBase\layout\fragment_quiz_detail.xml" (FeaturePageLayout "QUIZ · DETAIL" "Quiz Details" "content_detail")
MkFile "$resBase\layout\fragment_quiz_attempt.xml" (FeaturePageLayout "QUIZ · ATTEMPT" "Answer Questions" "content_attempt")
MkFile "$resBase\layout\fragment_quiz_result.xml" (FeaturePageLayout "QUIZ · RESULT" "Quiz Results" "content_result")
MkFile "$resBase\layout\fragment_leaderboard.xml" (FeatureListLayout "QUIZ · LEADERBOARD" "Leaderboard" "rv_leaderboard" "")

# Jobs pages
MkFile "$resBase\layout\fragment_jobs.xml" (FeatureListLayout "JOBS · ARENA" "Job Matches" "rv_jobs" @"

        <com.google.android.material.tabs.TabLayout
            android:id="@+id/tab_layout"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_md"
            style="@style/Widget.App.Tab" />
"@)

MkFile "$resBase\layout\fragment_job_detail.xml" (FeaturePageLayout "JOB · DETAIL" "Job Details" "content_detail")
MkFile "$resBase\layout\fragment_saved_jobs.xml" (FeatureListLayout "JOBS · WISHLIST" "Saved Jobs" "rv_saved_jobs" "")

# Profile pages
MkFile "$resBase\layout\fragment_profile.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<androidx.core.widget.NestedScrollView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void"
    android:scrollbars="none">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="@dimen/spacing_md">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="PROFILE"
            android:textAppearance="@style/TextAppearance.App.Label" />

        <!-- Avatar + name card -->
        <com.google.android.material.card.MaterialCardView
            android:id="@+id/card_avatar"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_md"
            style="@style/Widget.App.Card">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:gravity="center_vertical"
                android:orientation="horizontal">

                <ImageView
                    android:id="@+id/iv_avatar"
                    android:layout_width="@dimen/avatar_large"
                    android:layout_height="@dimen/avatar_large"
                    android:background="@drawable/bg_input_dark"
                    android:scaleType="centerCrop"
                    android:importantForAccessibility="no" />

                <LinearLayout
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="@dimen/spacing_md"
                    android:layout_weight="1"
                    android:orientation="vertical">

                    <TextView
                        android:id="@+id/tv_name"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:textAppearance="@style/TextAppearance.App.Title" />

                    <TextView
                        android:id="@+id/tv_email"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:layout_marginTop="2dp"
                        android:textAppearance="@style/TextAppearance.App.BodySmall" />
                </LinearLayout>
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Stats row -->
        <com.google.android.material.card.MaterialCardView
            android:id="@+id/card_stats"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_md"
            style="@style/Widget.App.Card.Sunken">

            <LinearLayout
                android:id="@+id/ll_stats"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="horizontal" />

        </com.google.android.material.card.MaterialCardView>

        <View
            android:layout_width="match_parent"
            android:layout_height="1dp"
            android:layout_marginVertical="@dimen/spacing_lg"
            android:background="@color/border_subtle" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="ACHIEVEMENTS"
            android:textAppearance="@style/TextAppearance.App.Label" />

        <androidx.recyclerview.widget.RecyclerView
            android:id="@+id/rv_achievements"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_sm"
            android:nestedScrollingEnabled="false"
            android:overScrollMode="never" />

        <!-- Settings / Logout section -->
        <View
            android:layout_width="match_parent"
            android:layout_height="1dp"
            android:layout_marginVertical="@dimen/spacing_lg"
            android:background="@color/border_subtle" />

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btn_settings"
            android:layout_width="match_parent"
            android:layout_height="@dimen/button_height"
            android:text="@string/settings"
            style="@style/Widget.App.Button.Outline"
            app:icon="@drawable/ic_settings"
            app:iconGravity="textStart" />

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btn_logout"
            android:layout_width="match_parent"
            android:layout_height="@dimen/button_height"
            android:layout_marginTop="@dimen/spacing_sm"
            android:text="@string/logout"
            style="@style/Widget.App.Button.Ghost"
            android:textColor="@color/destructive"
            app:icon="@drawable/ic_logout"
            app:iconGravity="textStart"
            app:iconTint="@color/destructive" />

    </LinearLayout>
</androidx.core.widget.NestedScrollView>
"@

MkFile "$resBase\layout\fragment_settings.xml" (FeaturePageLayout "SETTINGS" "App Settings" "content_settings")

Write-Host "Feature layouts updated." -ForegroundColor Green

# ─── Item Layouts ─────────────────────────────────────────

# Resume card item
MkFile "$resBase\layout\item_resume_card.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.card.MaterialCardView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginBottom="@dimen/spacing_sm"
    style="@style/Widget.App.Card.Interactive">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <!-- File icon container (sunken) -->
        <FrameLayout
            android:layout_width="@dimen/card_icon_size"
            android:layout_height="@dimen/card_icon_size"
            android:background="@drawable/bg_input_dark">
            <ImageView
                android:layout_width="20dp"
                android:layout_height="20dp"
                android:layout_gravity="center"
                android:src="@drawable/ic_resume"
                app:tint="@color/color_resume"
                android:importantForAccessibility="no" />
        </FrameLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="@dimen/spacing_md"
            android:orientation="vertical">

            <TextView
                android:id="@+id/tv_filename"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:textAppearance="@style/TextAppearance.App.Title"
                android:textSize="@dimen/text_md"
                android:singleLine="true"
                android:ellipsize="end" />

            <TextView
                android:id="@+id/tv_date"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="2dp"
                android:textAppearance="@style/TextAppearance.App.Label" />
        </LinearLayout>

        <!-- Status badge -->
        <TextView
            android:id="@+id/tv_status"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/shape_pill_badge"
            android:textAppearance="@style/TextAppearance.App.Label"
            android:textColor="@color/score_high" />

    </LinearLayout>
</com.google.android.material.card.MaterialCardView>
"@

# Session card item
MkFile "$resBase\layout\item_session_card.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.card.MaterialCardView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginBottom="@dimen/spacing_sm"
    style="@style/Widget.App.Card.Interactive">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <FrameLayout
            android:id="@+id/icon_container"
            android:layout_width="@dimen/card_icon_size"
            android:layout_height="@dimen/card_icon_size"
            android:background="@drawable/bg_input_dark">
            <ImageView
                android:id="@+id/iv_icon"
                android:layout_width="20dp"
                android:layout_height="20dp"
                android:layout_gravity="center"
                android:src="@drawable/ic_interview"
                app:tint="@color/color_interview"
                android:importantForAccessibility="no" />
        </FrameLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="@dimen/spacing_md"
            android:orientation="vertical">

            <TextView
                android:id="@+id/tv_type"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:textAppearance="@style/TextAppearance.App.Title"
                android:textSize="@dimen/text_md"
                android:singleLine="true" />

            <TextView
                android:id="@+id/tv_detail"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="2dp"
                android:textAppearance="@style/TextAppearance.App.Label" />
        </LinearLayout>

        <!-- Score badge -->
        <TextView
            android:id="@+id/tv_score"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/shape_score_badge"
            android:textAppearance="@style/TextAppearance.App.Mono"
            android:textColor="@color/text_prim" />
    </LinearLayout>
</com.google.android.material.card.MaterialCardView>
"@

# Job card item
MkFile "$resBase\layout\item_job_card.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.card.MaterialCardView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginBottom="@dimen/spacing_sm"
    style="@style/Widget.App.Card.Interactive">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical">

        <!-- Header row -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center_vertical"
            android:orientation="horizontal">

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:id="@+id/tv_job_title"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:textAppearance="@style/TextAppearance.App.Title"
                    android:textSize="@dimen/text_md"
                    android:singleLine="true"
                    android:ellipsize="end" />

                <TextView
                    android:id="@+id/tv_company"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="2dp"
                    android:textAppearance="@style/TextAppearance.App.BodySmall" />
            </LinearLayout>

            <!-- Match score badge -->
            <TextView
                android:id="@+id/tv_match_score"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:background="@drawable/shape_score_badge"
                android:textAppearance="@style/TextAppearance.App.Mono"
                android:textSize="@dimen/text_sm" />

            <ImageButton
                android:id="@+id/btn_save"
                android:layout_width="36dp"
                android:layout_height="36dp"
                android:layout_marginStart="@dimen/spacing_sm"
                android:background="?attr/selectableItemBackgroundBorderless"
                android:src="@drawable/ic_bookmark"
                android:scaleType="center"
                android:contentDescription="Save job"
                app:tint="@color/text_muted" />
        </LinearLayout>

        <!-- Location + type row -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/spacing_sm"
            android:gravity="center_vertical"
            android:orientation="horizontal">

            <TextView
                android:id="@+id/tv_location"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:background="@drawable/shape_chip"
                android:textAppearance="@style/TextAppearance.App.Label"
                android:textColor="@color/text_sec"
                android:drawablePadding="4dp" />

            <TextView
                android:id="@+id/tv_job_type"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="@dimen/spacing_sm"
                android:background="@drawable/shape_chip"
                android:textAppearance="@style/TextAppearance.App.Label"
                android:textColor="@color/text_sec" />
        </LinearLayout>
    </LinearLayout>
</com.google.android.material.card.MaterialCardView>
"@

# Quiz card item
MkFile "$resBase\layout\item_quiz_card.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.card.MaterialCardView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginBottom="@dimen/spacing_sm"
    style="@style/Widget.App.Card.Interactive">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <FrameLayout
            android:layout_width="@dimen/card_icon_size"
            android:layout_height="@dimen/card_icon_size"
            android:background="@drawable/bg_input_dark">
            <ImageView
                android:layout_width="20dp"
                android:layout_height="20dp"
                android:layout_gravity="center"
                android:src="@drawable/ic_quiz"
                app:tint="@color/color_quiz"
                android:importantForAccessibility="no" />
        </FrameLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="@dimen/spacing_md"
            android:orientation="vertical">

            <TextView
                android:id="@+id/tv_topic"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:textAppearance="@style/TextAppearance.App.Title"
                android:textSize="@dimen/text_md"
                android:singleLine="true" />

            <LinearLayout
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="2dp"
                android:orientation="horizontal">

                <TextView
                    android:id="@+id/tv_difficulty"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:background="@drawable/shape_pill_badge"
                    android:textAppearance="@style/TextAppearance.App.Label" />

                <TextView
                    android:id="@+id/tv_question_count"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginStart="@dimen/spacing_sm"
                    android:textAppearance="@style/TextAppearance.App.Label" />
            </LinearLayout>
        </LinearLayout>

        <ImageView
            android:layout_width="16dp"
            android:layout_height="16dp"
            android:src="@drawable/ic_arrow_forward"
            app:tint="@color/text_disabled"
            android:importantForAccessibility="no" />
    </LinearLayout>
</com.google.android.material.card.MaterialCardView>
"@

# Remaining item layouts (slim versions)
$slimItems = @{
    "item_question_bank" = @("iv_icon", "tv_question", "tv_category")
    "item_quiz_option" = @("tv_option_letter", "tv_option_text")
    "item_quiz_review" = @("tv_question_num", "tv_result_icon", "tv_explanation")
    "item_leaderboard_row" = @("tv_rank", "iv_avatar", "tv_username", "tv_score")
    "item_skill_chip" = @("tv_skill_name")
    "item_score_dimension" = @("tv_dimension", "progress_bar", "tv_score_value")
    "item_achievement" = @("iv_badge", "tv_achievement_title", "tv_achievement_desc")
    "item_emotion_segment" = @("tv_timestamp", "tv_emotion_label", "progress_confidence")
}

foreach ($name in $slimItems.Keys) {
    $fields = $slimItems[$name]
    $fieldViews = ($fields | ForEach-Object {
        if ($_ -like "iv_*" -or $_ -like "progress_*") {
            if ($_ -like "iv_*") {
                "        <ImageView android:id=""@+id/$_"" android:layout_width=""24dp"" android:layout_height=""24dp"" android:importantForAccessibility=""no"" app:tint=""@color/text_muted"" />"
            } else {
                "        <ProgressBar android:id=""@+id/$_"" style=""?android:attr/progressBarStyleHorizontal"" android:layout_width=""0dp"" android:layout_height=""4dp"" android:layout_weight=""1"" android:progressTint=""@color/primary"" android:progressBackgroundTint=""@color/bg_muted"" />"
            }
        } else {
            "        <TextView android:id=""@+id/$_"" android:layout_width=""wrap_content"" android:layout_height=""wrap_content"" android:textAppearance=""@style/TextAppearance.App.BodySmall"" android:textColor=""@color/text_sec"" />"
        }
    }) -join "`n"

    MkFile "$resBase\layout\$name.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.card.MaterialCardView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginBottom="@dimen/spacing_xs"
    style="@style/Widget.App.Card">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">

$fieldViews

    </LinearLayout>
</com.google.android.material.card.MaterialCardView>
"@
}

# Loading overlay
MkFile "$resBase\layout\layout_loading_overlay.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/loading_overlay"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/overlay_80"
    android:clickable="true"
    android:focusable="true"
    android:elevation="100dp"
    android:visibility="gone">

    <ProgressBar
        android:layout_width="40dp"
        android:layout_height="40dp"
        android:layout_gravity="center"
        android:indeterminateTint="@color/primary" />

</FrameLayout>
"@

Write-Host "Item layouts updated." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# FINAL COUNT
# ═══════════════════════════════════════════════════════════
$totalFiles = (Get-ChildItem -Path "$resBase" -Recurse -File).Count
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  XML OVERHAUL COMPLETE!" -ForegroundColor Green
Write-Host "  Total resource files: $totalFiles" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
