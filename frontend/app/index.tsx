import React, { useState } from "react";
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
import { generateImage, getMediaUrl, ImageGenerateResponse } from "../src/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = (SCREEN_WIDTH - 48) / 2;

type Stage = "idle" | "generating" | "done" | "error";

export default function HomeScreen() {
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ImageGenerateResponse | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setStage("generating");
    setError("");
    setResult(null);

    try {
      const response = await generateImage(prompt.trim());
      setResult(response);
      setStage("done");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setStage("error");
    }
  };

  const isLoading = stage === "generating";

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

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleGenerate}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? "Generating..." : "Generate"}
        </Text>
      </TouchableOpacity>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c5cff" />
          <Text style={styles.loadingText}>Generating image...</Text>
          <Text style={styles.loadingSubtext}>This may take a few minutes</Text>
        </View>
      )}

      {/* Error display */}
      {stage === "error" && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Generated images */}
      {result && (
        <>
          <Text style={styles.sectionTitle}>Generated Images</Text>
          <View style={styles.imageGrid}>
            {result.image_urls.map((url, i) => (
              <View key={i} style={styles.imageWrapper}>
                <Image
                  source={{ uri: getMediaUrl(url) }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </View>
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
  gridImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE * 1.46,
  },
});
