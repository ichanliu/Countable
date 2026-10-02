import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, InterWeights, Radius } from '../constants/theme';
import type { WidgetImageCrop } from '../constants/types';

interface WidgetCropEditorProps {
  uri: string;
  initialCrop?: WidgetImageCrop;
  onCancel: () => void;
  onSave: (crop: WidgetImageCrop) => void;
}

const FRAME_SIZE = 224;

export default function WidgetCropEditor({
  uri,
  initialCrop,
  onCancel,
  onSave,
}: WidgetCropEditorProps) {
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? 1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  const dragOrigin = useRef(offset);
  const initialized = useRef(false);

  useEffect(() => {
    Image.getSize(uri, (width, height) => setImageSize({ width, height }));
  }, [uri]);

  const baseScale = imageSize
    ? Math.max(FRAME_SIZE / imageSize.width, FRAME_SIZE / imageSize.height)
    : 1;
  const imageWidth = imageSize ? imageSize.width * baseScale * zoom : FRAME_SIZE;
  const imageHeight = imageSize ? imageSize.height * baseScale * zoom : FRAME_SIZE;

  const setClampedOffset = (next: { x: number; y: number }) => {
    const clamped = {
      x: Math.max((FRAME_SIZE - imageWidth) / 2, Math.min((imageWidth - FRAME_SIZE) / 2, next.x)),
      y: Math.max((FRAME_SIZE - imageHeight) / 2, Math.min((imageHeight - FRAME_SIZE) / 2, next.y)),
    };
    offsetRef.current = clamped;
    setOffset(clamped);
  };

  const setOffsetForSize = (next: { x: number; y: number }, width: number, height: number) => {
    const clamped = {
      x: Math.max((FRAME_SIZE - width) / 2, Math.min((width - FRAME_SIZE) / 2, next.x)),
      y: Math.max((FRAME_SIZE - height) / 2, Math.min((height - FRAME_SIZE) / 2, next.y)),
    };
    offsetRef.current = clamped;
    setOffset(clamped);
  };

  useEffect(() => {
    if (!imageSize || initialized.current) return;
    initialized.current = true;
    setClampedOffset({
      x: (0.5 - (initialCrop?.focusX ?? 0.5)) * imageWidth,
      y: (0.5 - (initialCrop?.focusY ?? 0.5)) * imageHeight,
    });
  }, [imageSize, imageWidth, imageHeight, initialCrop?.focusX, initialCrop?.focusY]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      dragOrigin.current = offsetRef.current;
    },
    onPanResponderMove: (_event, gesture) => {
      setClampedOffset({
        x: dragOrigin.current.x + gesture.dx,
        y: dragOrigin.current.y + gesture.dy,
      });
    },
  }), [imageWidth, imageHeight, zoom]);

  const changeZoom = (amount: number) => {
    const focusX = imageSize ? 0.5 - offsetRef.current.x / imageWidth : 0.5;
    const focusY = imageSize ? 0.5 - offsetRef.current.y / imageHeight : 0.5;
    const nextZoom = Math.max(1, Math.min(3, Number((zoom + amount).toFixed(1))));
    setZoom(nextZoom);
    if (imageSize) {
      const nextWidth = imageSize.width * baseScale * nextZoom;
      const nextHeight = imageSize.height * baseScale * nextZoom;
      setOffsetForSize(
        { x: (0.5 - focusX) * nextWidth, y: (0.5 - focusY) * nextHeight },
        nextWidth,
        nextHeight
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Widget image framing</Text>
      <Text style={styles.hint}>Drag to adjust the crop; use the controls below to zoom.</Text>
      <View style={styles.frame} {...panResponder.panHandlers}>
        <Image
          source={{ uri }}
          resizeMode="stretch"
          style={[
            styles.image,
            {
              width: imageWidth,
              height: imageHeight,
              left: (FRAME_SIZE - imageWidth) / 2 + offset.x,
              top: (FRAME_SIZE - imageHeight) / 2 + offset.y,
            },
          ]}
        />
      </View>
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Zoom out"
          onPress={() => changeZoom(-0.1)}
          disabled={zoom <= 1}
          style={styles.zoomButton}
        >
          <Ionicons name="remove" size={20} color={zoom <= 1 ? Colors.mutedForeground : Colors.primary} />
        </Pressable>
        <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
        <Pressable
          accessibilityLabel="Zoom in"
          onPress={() => changeZoom(0.1)}
          disabled={zoom >= 3}
          style={styles.zoomButton}
        >
          <Ionicons name="add" size={20} color={zoom >= 3 ? Colors.mutedForeground : Colors.primary} />
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={styles.saveButton}
          onPress={() => onSave({
            focusX: Math.max(0, Math.min(1, 0.5 - offsetRef.current.x / imageWidth)),
            focusY: Math.max(0, Math.min(1, 0.5 - offsetRef.current.y / imageHeight)),
            zoom,
          })}
        >
          <Text style={styles.saveText}>Use framing</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.card,
    borderRadius: Radius.section,
    width: '90%',
    maxWidth: 360,
  },
  title: {
    color: Colors.foreground,
    fontSize: 17,
    fontFamily: InterWeights.semiBold,
  },
  hint: {
    color: Colors.mutedForeground,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#17202C',
  },
  image: {
    position: 'absolute',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 12,
  },
  zoomButton: {
    padding: 8,
  },
  zoomText: {
    minWidth: 48,
    textAlign: 'center',
    color: Colors.foreground,
    fontFamily: InterWeights.medium,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
  },
  cancelText: {
    color: Colors.foreground,
    fontFamily: InterWeights.medium,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
  },
  saveText: {
    color: '#FFFFFF',
    fontFamily: InterWeights.semiBold,
  },
});
