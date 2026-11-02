package it.nova.client;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

public final class NovaMenuScreen extends Screen {
    public NovaMenuScreen() {
        super(Text.literal("NOVA CLIENT - HUD Settings"));
    }

    @Override
    protected void init() {
        int panelWidth = 260;
        int left = this.width / 2 - panelWidth / 2;
        int top = this.height / 2 - 130;
        int btnWidth = panelWidth;
        int btnHeight = 20;
        int spacing = 22;

        int y = top + 26;

        // Toggle modules
        addDrawableChild(ButtonWidget.builder(toggleLabel("Contatore FPS", NovaHud.showFps), button -> {
            NovaHud.showFps = !NovaHud.showFps;
            NovaHud.saveConfig();
            button.setMessage(toggleLabel("Contatore FPS", NovaHud.showFps));
        }).dimensions(left, y, btnWidth / 2 - 2, btnHeight).build());

        addDrawableChild(ButtonWidget.builder(toggleLabel("Contatore CPS", NovaHud.showCps), button -> {
            NovaHud.showCps = !NovaHud.showCps;
            NovaHud.saveConfig();
            button.setMessage(toggleLabel("Contatore CPS", NovaHud.showCps));
        }).dimensions(left + btnWidth / 2 + 2, y, btnWidth / 2 - 2, btnHeight).build());

        y += spacing;

        addDrawableChild(ButtonWidget.builder(toggleLabel("Keystrokes WASD", NovaHud.showKeys), button -> {
            NovaHud.showKeys = !NovaHud.showKeys;
            NovaHud.saveConfig();
            button.setMessage(toggleLabel("Keystrokes WASD", NovaHud.showKeys));
        }).dimensions(left, y, btnWidth / 2 - 2, btnHeight).build());

        addDrawableChild(ButtonWidget.builder(toggleLabel("Coordinate XYZ", NovaHud.showCoordinates), button -> {
            NovaHud.showCoordinates = !NovaHud.showCoordinates;
            NovaHud.saveConfig();
            button.setMessage(toggleLabel("Coordinate XYZ", NovaHud.showCoordinates));
        }).dimensions(left + btnWidth / 2 + 2, y, btnWidth / 2 - 2, btnHeight).build());

        y += spacing;

        addDrawableChild(ButtonWidget.builder(toggleLabel("Toggle Sprint", NovaHud.showSprint), button -> {
            NovaHud.showSprint = !NovaHud.showSprint;
            NovaHud.saveConfig();
            button.setMessage(toggleLabel("Toggle Sprint", NovaHud.showSprint));
        }).dimensions(left, y, btnWidth, btnHeight).build());

        y += spacing + 4;

        // Customization controls
        addDrawableChild(ButtonWidget.builder(settingLabel("Posizione", NovaHud.POSITION_NAMES[NovaHud.positionMode]), button -> {
            NovaHud.positionMode = (NovaHud.positionMode + 1) % NovaHud.POSITION_NAMES.length;
            NovaHud.saveConfig();
            button.setMessage(settingLabel("Posizione", NovaHud.POSITION_NAMES[NovaHud.positionMode]));
        }).dimensions(left, y, btnWidth, btnHeight).build());

        y += spacing;

        addDrawableChild(ButtonWidget.builder(settingLabel("Dimensione HUD", NovaHud.SCALE_NAMES[NovaHud.scaleMode]), button -> {
            NovaHud.scaleMode = (NovaHud.scaleMode + 1) % NovaHud.SCALE_NAMES.length;
            NovaHud.saveConfig();
            button.setMessage(settingLabel("Dimensione HUD", NovaHud.SCALE_NAMES[NovaHud.scaleMode]));
        }).dimensions(left, y, btnWidth, btnHeight).build());

        y += spacing;

        addDrawableChild(ButtonWidget.builder(settingLabel("Colore Tema", NovaHud.COLOR_NAMES[NovaHud.colorTheme]), button -> {
            NovaHud.colorTheme = (NovaHud.colorTheme + 1) % NovaHud.COLOR_NAMES.length;
            NovaHud.saveConfig();
            button.setMessage(settingLabel("Colore Tema", NovaHud.COLOR_NAMES[NovaHud.colorTheme]));
        }).dimensions(left, y, btnWidth, btnHeight).build());

        y += spacing;

        addDrawableChild(ButtonWidget.builder(settingLabel("Trasparenza Sfondo", NovaHud.OPACITY_NAMES[NovaHud.bgOpacityMode]), button -> {
            NovaHud.bgOpacityMode = (NovaHud.bgOpacityMode + 1) % NovaHud.OPACITY_NAMES.length;
            NovaHud.saveConfig();
            button.setMessage(settingLabel("Trasparenza Sfondo", NovaHud.OPACITY_NAMES[NovaHud.bgOpacityMode]));
        }).dimensions(left, y, btnWidth, btnHeight).build());

        y += spacing + 6;

        // Actions: Reset & Close
        addDrawableChild(ButtonWidget.builder(Text.literal("Ripristina Predefiniti"), button -> {
            NovaHud.resetDefaults();
            if (this.client != null) this.client.setScreen(new NovaMenuScreen());
        }).dimensions(left, y, btnWidth / 2 - 2, btnHeight).build());

        addDrawableChild(ButtonWidget.builder(Text.literal("Chiudi  ·  ESC"), button -> close())
                .dimensions(left + btnWidth / 2 + 2, y, btnWidth / 2 - 2, btnHeight).build());
    }

    private static Text toggleLabel(String name, boolean enabled) {
        return Text.literal(name + ": " + (enabled ? "ON" : "OFF"));
    }

    private static Text settingLabel(String label, String value) {
        return Text.literal(label + ": " + value);
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);
        int panelWidth = 276;
        int panelHeight = 265;
        int left = this.width / 2 - panelWidth / 2;
        int top = this.height / 2 - 138;

        // Main panel card
        context.fill(left, top, left + panelWidth, top + panelHeight, 0xE8141422);

        // Header purple bar
        context.fill(left, top, left + panelWidth, top + 24, 0xFF6C4AC8);
        context.drawTextWithShadow(this.textRenderer, "NOVA CLIENT  ·  MOD MENU", left + 10, top + 8, 0xFFFFFFFF);

        // Subtitle
        context.drawTextWithShadow(this.textRenderer, "Personalizzazione HUD in tempo reale", left + 10, top + 245, 0xFF88889C);

        super.render(context, mouseX, mouseY, delta);
    }

    @Override
    public void close() {
        if (this.client != null) {
            this.client.setScreen(null);
        }
    }

    @Override
    public boolean shouldPause() {
        return false;
    }
}
