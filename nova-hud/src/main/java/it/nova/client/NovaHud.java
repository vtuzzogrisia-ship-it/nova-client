package it.nova.client;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.render.RenderTickCounter;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayDeque;
import java.util.Deque;

public final class NovaHud implements ClientModInitializer {
    private static KeyBinding menuKey;
    private static KeyBinding fpsKey;
    private static KeyBinding cpsKey;
    private static KeyBinding keysKey;
    private static KeyBinding coordinatesKey;
    private static boolean menuOpen = false;
    private static boolean showFps = true;
    private static boolean showCps = true;
    private static boolean showKeys = true;
    private static boolean showCoordinates = true;
    private static boolean leftWasDown = false;
    private static boolean rightWasDown = false;
    private static final Deque<Long> leftClicks = new ArrayDeque<>();
    private static final Deque<Long> rightClicks = new ArrayDeque<>();

    @Override
    public void onInitializeClient() {
        menuKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.nova_hud.menu",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_RIGHT_SHIFT,
                "category.nova_hud"
        ));
        fpsKey = registerToggle("key.nova_hud.fps", GLFW.GLFW_KEY_F);
        cpsKey = registerToggle("key.nova_hud.cps", GLFW.GLFW_KEY_C);
        keysKey = registerToggle("key.nova_hud.keystrokes", GLFW.GLFW_KEY_K);
        coordinatesKey = registerToggle("key.nova_hud.coordinates", GLFW.GLFW_KEY_X);
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (menuKey.wasPressed()) menuOpen = !menuOpen;
            while (fpsKey.wasPressed()) showFps = !showFps;
            while (cpsKey.wasPressed()) showCps = !showCps;
            while (keysKey.wasPressed()) showKeys = !showKeys;
            while (coordinatesKey.wasPressed()) showCoordinates = !showCoordinates;
        });
        HudRenderCallback.EVENT.register(NovaHud::render);
    }

    private static KeyBinding registerToggle(String translationKey, int keyCode) {
        return KeyBindingHelper.registerKeyBinding(new KeyBinding(translationKey, InputUtil.Type.KEYSYM, keyCode, "category.nova_hud"));
    }

    private static void render(DrawContext context, RenderTickCounter tickCounter) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player == null || client.world == null) return;

        long now = System.currentTimeMillis();
        long window = client.getWindow().getHandle();
        updateClicks(window, now);
        int y = 10;

        if (showFps) {
            context.drawTextWithShadow(client.textRenderer, "NOVA  " + client.getCurrentFps() + " FPS", 10, y, 0xFFB99BFF);
            y += 12;
        }
        if (showCps) {
            context.drawTextWithShadow(client.textRenderer,
                    "CPS  L " + leftClicks.size() + "  R " + rightClicks.size(), 10, y, 0xFFFFFFFF);
            y += 12;
        }
        if (showCoordinates) {
            context.drawTextWithShadow(client.textRenderer,
                    String.format("XYZ  %.1f  %.1f  %.1f", client.player.getX(), client.player.getY(), client.player.getZ()),
                    10, y, 0xFF8FE3C0);
            y += 12;
        }
        if (showKeys) {
            drawKey(context, client, "W", client.options.forwardKey.isPressed(), 40, y + 2);
            drawKey(context, client, "A", client.options.leftKey.isPressed(), 28, y + 14);
            drawKey(context, client, "S", client.options.backKey.isPressed(), 40, y + 14);
            drawKey(context, client, "D", client.options.rightKey.isPressed(), 52, y + 14);
            drawKey(context, client, "JUMP", client.options.jumpKey.isPressed(), 70, y + 14);
            drawKey(context, client, "LMB", leftWasDown, 28, y + 28);
            drawKey(context, client, "RMB", rightWasDown, 70, y + 28);
        }

        if (menuOpen) {
            int left = 12;
            int top = Math.max(92, y + 54);
            context.fill(left, top, left + 210, top + 112, 0xE8171725);
            context.fill(left, top, left + 210, top + 22, 0xFF7654C8);
            context.drawTextWithShadow(client.textRenderer, "NOVA CLIENT  ·  MOD MENU", left + 8, top + 7, 0xFFFFFFFF);
            context.drawTextWithShadow(client.textRenderer, "[F] FPS: " + (showFps ? "ON" : "OFF"), left + 10, top + 34, 0xFFFFFFFF);
            context.drawTextWithShadow(client.textRenderer, "[C] CPS: " + (showCps ? "ON" : "OFF"), left + 10, top + 50, 0xFFFFFFFF);
            context.drawTextWithShadow(client.textRenderer, "[K] Keystrokes: " + (showKeys ? "ON" : "OFF"), left + 10, top + 66, 0xFFFFFFFF);
            context.drawTextWithShadow(client.textRenderer, "[X] Coordinate: " + (showCoordinates ? "ON" : "OFF"), left + 10, top + 82, 0xFFFFFFFF);
            context.drawTextWithShadow(client.textRenderer, "Right Shift: chiudi menu", left + 10, top + 98, 0xFFB99BFF);
        }

    }

    private static void drawKey(DrawContext context, MinecraftClient client, String label, boolean pressed, int x, int y) {
        int color = pressed ? 0xFF8056D9 : 0xB8202030;
        context.fill(x, y, x + (label.length() > 1 ? 34 : 11), y + 11, color);
        context.drawTextWithShadow(client.textRenderer, label, x + 2, y + 2, 0xFFFFFFFF);
    }

    private static void updateClicks(long window, long now) {
        boolean left = GLFW.glfwGetMouseButton(window, GLFW.GLFW_MOUSE_BUTTON_LEFT) == GLFW.GLFW_PRESS;
        boolean right = GLFW.glfwGetMouseButton(window, GLFW.GLFW_MOUSE_BUTTON_RIGHT) == GLFW.GLFW_PRESS;
        if (left && !leftWasDown) leftClicks.addLast(now);
        if (right && !rightWasDown) rightClicks.addLast(now);
        leftWasDown = left;
        rightWasDown = right;
        while (!leftClicks.isEmpty() && now - leftClicks.peekFirst() > 1000) leftClicks.removeFirst();
        while (!rightClicks.isEmpty() && now - rightClicks.peekFirst() > 1000) rightClicks.removeFirst();
    }
}
