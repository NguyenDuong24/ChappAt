import { Audio } from "expo-av";

async function isLoaded(sound: Audio.Sound | null | undefined): Promise<boolean> {
  if (!sound) return false;
  try {
    const status = await sound.getStatusAsync();
    return status.isLoaded;
  } catch {
    return false;
  }
}

export async function safeStop(sound: Audio.Sound | null | undefined): Promise<void> {
  if (await isLoaded(sound)) {
    try {
      await sound!.stopAsync();
    } catch {
    }
  }
}

export async function safeUnload(sound: Audio.Sound | null | undefined): Promise<void> {
  if (await isLoaded(sound)) {
    try {
      await sound!.unloadAsync();
    } catch {
    }
  }
}

export async function safeStopAndUnload(sound: Audio.Sound | null | undefined): Promise<void> {
  await safeStop(sound);
  await safeUnload(sound);
}

export async function safePlay(sound: Audio.Sound | null | undefined): Promise<void> {
  if (await isLoaded(sound)) {
    try {
      await sound!.playAsync();
    } catch {
    }
  }
}

export async function safeReplay(sound: Audio.Sound | null | undefined): Promise<void> {
  if (await isLoaded(sound)) {
    try {
      await sound!.replayAsync();
    } catch {
    }
  }
}

export async function safePause(sound: Audio.Sound | null | undefined): Promise<void> {
  if (await isLoaded(sound)) {
    try {
      await sound!.pauseAsync();
    } catch {
    }
  }
}

export async function safeSetPosition(sound: Audio.Sound | null | undefined, position: number): Promise<void> {
  if (await isLoaded(sound)) {
    try {
      await sound!.setPositionAsync(position);
    } catch {
    }
  }
}
