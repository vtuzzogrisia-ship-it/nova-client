package com.nova.client;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

public final class NovaModScreen extends Screen {
    private static final int PANEL_WIDTH = 430;
    private static final int PANEL_HEIGHT = 330;

    public NovaModScreen() {
        super(Text.literal("NOVA CLIENT"));
    }

    @Override
    protected void init() {
        int left = (this.width - PANEL_WIDTH) / 2;
        int top = (this.height - PANEL_HEIGHT) / 2;
        int x = left + 24;
        int y = top + 112;
        int buttonWidth = PANEL_WIDTH - 48;

        addDrawableChild(toggleButton(x, y, buttonWidth, "CPS Counter", () -> NovaClient.cpsEnabled, value -> NovaClient.cpsEnabled = value));
        addDrawableChild(toggleButton(x, y + 39, buttonWidth, "Keystrokes", () -> NovaClient.keystrokesEnabled, value -> NovaClient.keystrokesEnabled = value));
        addDrawableChild(toggleButton(x, y + 78, buttonWidth, "FPS Display", () -> NovaClient.fpsEnabled, value -> NovaClient.fpsEnabled = value));
        addDrawableChild(toggleButton(x, y + 117, buttonWidth, "Coordinates", () -> NovaClient.coordinatesEnabled, value -> NovaClient.coordinatesEnabled = value));
        addDrawableChild(toggleButton(x, y + 156, buttonWidth, "Toggle Sprint", () -> NovaClient.toggleSprintEnabled, value -> NovaClient.toggleSprintEnabled = value));

        addDrawableChild(ButtonWidget.builder(Text.literal("DONE"), button -> close())
            .dimensions(left + PANEL_WIDTH - 112, top + PANEL_HEIGHT - 43, 88, 25)
            .build());
    }

    private ButtonWidget toggleButton(int x, int y, int width, String name,
                                      java.util.function.BooleanSupplier getter,
                                      java.util.function.Consumer<Boolean> setter) {
        return ButtonWidget.builder(toggleLabel(name, getter.getAsBoolean()), button -> {
            boolean next = !getter.getAsBoolean();
            setter.accept(next);
            button.setMessage(toggleLabel(name, next));
        }).dimensions(x, y, width, 29).build();
    }

    private Text toggleLabel(String name, boolean enabled) {
        return Text.literal(name + "                                      " + (enabled ? "§aON" : "§7OFF"));
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        this.renderBackground(context, mouseX, mouseY, delta);
        int left = (this.width - PANEL_WIDTH) / 2;
        int top = (this.height - PANEL_HEIGHT) / 2;

        context.fill(left - 1, top - 1, left + PANEL_WIDTH + 1, top + PANEL_HEIGHT + 1, 0xFF9B78F5);
        context.fill(left, top, left + PANEL_WIDTH, top + PANEL_HEIGHT, 0xF20E0D18);
        context.fill(left, top, left + PANEL_WIDTH, top + 3, 0xFF9B78F5);

        context.drawTextWithShadow(this.textRenderer, Text.literal("NOVA CLIENT"), left + 24, top + 22, 0xFFFFFFFF);
        context.drawTextWithShadow(this.textRenderer, Text.literal("MOD MENU  /  RIGHT SHIFT"), left + 24, top + 42, 0xFFB59AFF);
        context.drawTextWithShadow(this.textRenderer, Text.literal("Toggle your client modules"), left + 24, top + 72, 0xFF9993AA);

        super.render(context, mouseX, mouseY, delta);
        context.drawTextWithShadow(this.textRenderer, Text.literal("NOVA CLIENT PREVIEW  •  SETTINGS RESET WHEN GAME RESTARTS"), left + 24, top + PANEL_HEIGHT - 30, 0xFF777184);
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
