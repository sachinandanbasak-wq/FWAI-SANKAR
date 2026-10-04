"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  Stage,
  Layer,
  Group,
  Path,
  Rect,
  Text as KText,
  Image as KImage,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import {
  SHIRT_PATH,
  SHIRT_VIEWBOX,
  UNITS_PER_INCH,
  printAreaFor,
  type Design,
  type DesignElement,
  type Side,
} from "@/lib/design";
import type { PublicProduct } from "@/lib/catalog";
import { clampElementToPrintArea } from "@/lib/geometry";

type Props = {
  product: PublicProduct;
  colorHex: string;
  side: Side;
  design: Design;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (design: Design) => void;
  editorMode: boolean;
  zoom?: number;
};

function useContainerWidth(ref: RefObject<HTMLDivElement>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function useImages(srcs: string[]): Record<string, HTMLImageElement> {
  const key = srcs.join("|");
  const [map, setMap] = useState<Record<string, HTMLImageElement>>({});
  useEffect(() => {
    const list = key ? key.split("|") : [];
    if (list.length === 0) {
      setMap({});
      return;
    }
    let active = true;
    const result: Record<string, HTMLImageElement> = {};
    let remaining = list.length;
    const done = () => {
      remaining -= 1;
      if (active && remaining === 0) setMap({ ...result });
    };
    list.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        result[src] = img;
        done();
      };
      img.onerror = done;
      img.src = src;
    });
    return () => {
      active = false;
    };
  }, [key]);
  return map;
}

export default function StudioCanvas({
  product,
  colorHex,
  side,
  design,
  selectedId,
  onSelect,
  onChange,
  editorMode,
  zoom = 1,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node>>({});
  const width = useContainerWidth(wrapRef);

  const shirtW = product.shirtBox.widthIn * UNITS_PER_INCH;
  const shirtH = product.shirtBox.heightIn * UNITS_PER_INCH;
  const scale = width > 0 ? (width / shirtW) * zoom : 0;
  const stageWidth = width * zoom;
  const displayH = width * (shirtH / shirtW) * zoom;

  const printArea = printAreaFor(product, side);
  const pw = printArea.widthIn * UNITS_PER_INCH;
  const ph = printArea.heightIn * UNITS_PER_INCH;

  const elements = design[side];
  const imageSrcs = elements
    .filter((e) => e.type === "image" && e.src)
    .map((e) => e.src as string);
  const images = useImages(imageSrcs);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? nodeRefs.current[selectedId] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, side, elements, images]);

  const commitElement = (next: DesignElement) => {
    onChange({
      ...design,
      [side]: elements.map((e) => (e.id === next.id ? next : e)),
    });
  };

  // Keep every element fully inside the visible print area. If it is bigger
  // than the area, it is scaled down to fit — never clipped, never lost.
  const clampElement = (el: DesignElement): DesignElement =>
    clampElementToPrintArea(el, pw, ph);

  const renderElement = (el: DesignElement) => {
    const common: Record<string, unknown> = {
      ref: (node: Konva.Node | null) => {
        if (node) nodeRefs.current[el.id] = node;
        else delete nodeRefs.current[el.id];
      },
      x: el.x,
      y: el.y,
      offsetX: el.width / 2,
      offsetY: el.height / 2,
      rotation: el.rotation,
      draggable: editorMode,
      onClick: () => onSelect(el.id),
      onTap: () => onSelect(el.id),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        commitElement(clampElement({ ...el, x: e.target.x(), y: e.target.y() }));
      },
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
        const node = e.target as Konva.Node;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        const next: DesignElement = {
          ...el,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(10, el.width * sx),
          height: Math.max(10, el.height * sy),
        };
        if (el.type === "text" && el.fontSize) {
          next.fontSize = Math.max(8, el.fontSize * sy);
        }
        commitElement(clampElement(next));
      },
    };

    if (el.type === "text") {
      return (
        <KText
          key={el.id}
          {...common}
          width={el.width}
          height={el.height}
          text={el.text ?? ""}
          fontFamily={el.fontFamily ?? "Arial"}
          fontSize={el.fontSize ?? 48}
          fill={el.fill ?? "#111111"}
          align="center"
          verticalAlign="middle"
          wrap="word"
        />
      );
    }

    const image = el.src ? images[el.src] : undefined;
    if (!image) return null;
    return (
      <KImage
        key={el.id}
        {...common}
        image={image}
        width={el.width}
        height={el.height}
      />
    );
  };

  return (
    <div ref={wrapRef} className="w-full">
      {width > 0 && (
        <Stage
          width={stageWidth}
          height={displayH}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) onSelect(null);
          }}
          onTouchStart={(e) => {
            if (e.target === e.target.getStage()) onSelect(null);
          }}
        >
          <Layer>
            <Group scaleX={scale} scaleY={scale}>
              <Path
                data={SHIRT_PATH}
                fill={colorHex}
                scaleX={shirtW / SHIRT_VIEWBOX.width}
                scaleY={shirtH / SHIRT_VIEWBOX.height}
                listening={false}
              />
              <Path
                data={SHIRT_PATH}
                scaleX={shirtW / SHIRT_VIEWBOX.width}
                scaleY={shirtH / SHIRT_VIEWBOX.height}
                listening={false}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: SHIRT_VIEWBOX.width, y: 0 }}
                fillLinearGradientColorStops={[
                  0,
                  "rgba(0,0,0,0.22)",
                  0.28,
                  "rgba(0,0,0,0.02)",
                  0.5,
                  "rgba(255,255,255,0.06)",
                  0.72,
                  "rgba(0,0,0,0.02)",
                  1,
                  "rgba(0,0,0,0.22)",
                ]}
              />

              {editorMode && (
                <Rect
                  x={printArea.xIn * UNITS_PER_INCH}
                  y={printArea.yIn * UNITS_PER_INCH}
                  width={pw}
                  height={ph}
                  stroke="#a8a29e"
                  dash={[14, 10]}
                  strokeWidth={2}
                  listening={false}
                />
              )}

              <Group
                x={printArea.xIn * UNITS_PER_INCH}
                y={printArea.yIn * UNITS_PER_INCH}
                globalCompositeOperation="multiply"
              >
                {elements.map(renderElement)}
              </Group>
            </Group>

            {editorMode && (
              <Transformer
                ref={trRef}
                rotateEnabled
                anchorSize={9}
                borderStroke="#b45309"
                anchorStroke="#b45309"
                anchorCornerRadius={2}
                boundBoxFunc={(oldBox, newBox) =>
                  newBox.width < 24 || newBox.height < 24 ? oldBox : newBox
                }
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
