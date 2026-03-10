import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { generateFull, getMediaUrl, FullGenerateResponse } from "../src/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = (SCREEN_WIDTH - 48) / 2;

type Stage = "idle" | "generating_images" | "generating_video" | "done" | "error";

export default function HomeScreen() {
  const [prompt, setPrompt] = useState("");
  const [motionPrompt, setMotionPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<FullGenerateResponse | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [error, setError] = useState("");
  const videoRef = useRef<Video>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setStage("generating_images");
    setError("");
    setResult(null);

    try {
      const response = await generateFull(
        prompt.trim(),
        motionPrompt.trim() || undefined,
        selectedImage
      );
      setResult(response);
      setStage("done");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setStage("error");
    }
  };

  const stageLabel: Record<Stage, string> = {
    idle: "",
    generating_images: "Generating images...",
    generating_video: "Creating video...",
    done: "Done!",
    error: "Error",
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Prompt input */}
      <Text style={styles.label}>Image Prompt</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe the image you want to generate..."
        placeholderTextColor="#666"
        value={prompt}
        onChangeText={setPrompt}
        multiline
        numberOfLines={3}
      />

      {/* Motion prompt input */}
      <Text style={styles.label}>Motion Prompt (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe camera movement, motion..."
        placeholderTextColor="#666"
        value={motionPrompt}
        onChangeText={setMotionPrompt}
        multiline
        numberOfLines={2}
      />

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.button, stage !== "idle" && stage !== "done" && stage !== "error" && styles.buttonDisabled]}
        onPress={handleGenerate}
        disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
      >
        <Text style={styles.buttonText}>
          {stage === "idle" || stage === "done" || stage === "error"
            ? "Generate"
            : stageLabel[stage]}
        </Text>
      </TouchableOpacity>

      {/* Loading indicator */}
      {(stage === "generating_images" || stage === "generating_video") && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c5cff" />
          <Text style={styles.loadingText}>{stageLabel[stage]}</Text>
          <Text style={styles.loadingSubtext}>This may take a few minutes</Text>
        </View>
      )}

      {/* Error display */}
      {stage === "error" && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Generated images grid */}
          <Text style={styles.sectionTitle}>Generated Images</Text>
          <View style={styles.imageGrid}>
            {result.image_urls.map((url, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedImage(i)}
                style={[
                  styles.imageWrapper,
                  selectedImage === i && styles.imageSelected,
                ]}
              >
                <Image
                  source={{ uri: getMediaUrl(url) }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                {selectedImage === i && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Generated video */}
          {result.video_url && (
            <>
              <Text style={styles.sectionTitle}>Generated Video</Text>
              <View style={styles.videoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: getMediaUrl(result.video_url) }}
                  style={styles.video}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping
                  useNativeControls
                />
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    color: "#c0c0d0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#7c5cff",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#3d3d5c",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 30,
  },
  loadingText: {
    color: "#c0c0d0",
    fontSize: 16,
    marginTop: 12,
  },
  loadingSubtext: {
    color: "#666",
    fontSize: 13,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: "#2e1a1a",
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#5c2a2a",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
  },
  sectionTitle: {
    color: "#e0e0e0",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  imageSelected: {
    borderColor: "#7c5cff",
  },
  gridImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE * 1.46, // Match 832:1216 aspect ratio
  },
  selectedBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "#7c5cff",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectedBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  videoContainer: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
  },
  video: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32, // 640x640 = square
  },
});
