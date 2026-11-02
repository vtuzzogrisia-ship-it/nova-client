package it.nova.client;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

public final class NovaMenuScreen extends Screen {
    public NovaMenuScreen() {
        super(Text.literal("NOVA CLIENT"));
    }

    @Override
    protected void init() {
        int left = this.width / 2 - 105;
        int top = this.height / 2 - 82;
        addDrawableChild(ButtonWidget.builder(label("FPS", NovaHud.showFps), button -> {
            NovaHud.setShowFps(!NovaHud.showFps);
            button.setMessage(label("FPS", NovaHud.showFps));
        }).dimensions(left, top, 210, 20).build());
        addDrawableChild(ButtonWidget.builder(label("CPS", NovaHud.showCps), button -> {
            NovaHud.setShowCps(!NovaHud.showCps);
            button.setMessage(label("CPS", NovaHud.showCps));
        }).dimensions(left, top + 25, 210, 20).build());
        addDrawableChild(ButtonWidget.builder(label("Keystrokes", NovaHud.showKeys), button -> {
            NovaHud.setShowKeys(!NovaHud.showKeys);
            button.setMessage(label("Keystrokes", NovaHud.showKeys));
        }).dimensions(left, top + 50, 210, 20).build());
        addDrawableChild(ButtonWidget.builder(label("Coordinate", NovaHud.showCoordinates), button -> {
            NovaHud.setShowCoordinates(!NovaHud.showCoordinates);
            button.setMessage(label("Coordinate", NovaHud.showCoordinates));
        }).dimensions(left, top + 75, 210, 20).build());
        addDrawableChild(ButtonWidget.builder(Text.literal("Chiudi  ·  ESC"), button -> close())
                .dimensions(left, top + 105, 210, 20).build());
    }

    private static Text label(String name, boolean enabled) {
        return Text.literal(name + ": " + (enabled ? "ON" : "OFF"));
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);
        int left = this.width / 2 - 116;
        int top = this.height / 2 - 100;
        context.fill(left, top, left + 232, top + 238, 0xE8171725);
        context.fill(left, top, left + 232, top + 24, 0xFF7654C8);
        context.drawTextWithShadow(this.textRenderer, "NOVA CLIENT  ·  MOD MENU", left + 9, top + 8, 0xFFFFFFFF);
        super.render(context, mouseX, mouseY, delta);
    }

    @Override
    public void close() {
        if (this.client != null) this.client.setScreen(null);
    }

    @Override
    public boolean shouldPause() {
        return false;
    }
}
