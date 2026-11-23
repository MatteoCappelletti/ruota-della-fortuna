import { Component, input, output, signal } from '@angular/core';

interface Slice {
  index: number;
  label: string;
  displayLabel: string;
  color: string;
  path: string;
  labelX: number;
  labelY: number;
  labelRotation: number;
  fontSize: number;
}

export interface WheelDrag {
  rotationDelta: number;
  velocity: number;
}

const COLORS = ['#f3a681', '#f4c85d', '#a8c9a2', '#8db7c7', '#d2a7c7', '#ee8974', '#91b7a9', '#efc3a1'];

@Component({
  selector: 'app-wheel',
  templateUrl: './wheel.html',
  styleUrl: './wheel.css',
})
export class Wheel {
  readonly entries = input.required<string[]>();
  readonly rotation = input(0);
  readonly duration = input(3600);
  readonly disabled = input(false);
  readonly spinFinished = output<void>();
  readonly dragSpinRequested = output<WheelDrag>();
  protected readonly isDragging = signal(false);
  protected readonly dragRotation = signal(0);
  private previousPointerAngle = 0;
  private previousPointerTime = 0;
  private angularVelocity = 0;

  protected get slices(): Slice[] {
    const entries = this.entries();
    if (!entries.length) return [];

    const angle = 360 / entries.length;
    return entries.map((label, index) => {
      const start = -90 + index * angle;
      const end = start + angle;
      const midpoint = start + angle / 2;
      const startPoint = this.point(start, 184);
      const endPoint = this.point(end, 184);
      const labelPoint = this.point(midpoint, 116);
      const fontSize = Math.min(15, Math.max(8, 118 / Math.max(label.length, 8)));
      const maxCharacters = Math.floor(112 / (fontSize * 0.62));
      const largeArc = angle > 180 ? 1 : 0;
      const path = entries.length === 1
        ? 'M 200 200 m -184 0 a 184 184 0 1 0 368 0 a 184 184 0 1 0 -368 0'
        : `M 200 200 L ${startPoint.x} ${startPoint.y} A 184 184 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`;

      return {
        index,
        label,
        displayLabel: label.length > maxCharacters
          ? `${label.slice(0, maxCharacters - 1)}…`
          : label,
        color: COLORS[index % COLORS.length],
        path,
        labelX: labelPoint.x,
        labelY: labelPoint.y,
        labelRotation: midpoint > 90 && midpoint < 270 ? midpoint - 180 : midpoint,
        fontSize,
      };
    });
  }

  protected animationFinished(): void {
    this.spinFinished.emit();
  }

  protected startDrag(event: PointerEvent): void {
    if (this.disabled() || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (!(event.currentTarget instanceof HTMLElement)) return;

    const pointer = this.pointerPosition(event, event.currentTarget);
    if (!pointer || pointer.radius < event.currentTarget.clientWidth * 0.12) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    this.previousPointerAngle = pointer.angle;
    this.previousPointerTime = event.timeStamp;
    this.angularVelocity = 0;
    this.dragRotation.set(0);
    this.isDragging.set(true);
  }

  protected moveDrag(event: PointerEvent): void {
    if (!this.isDragging() || !(event.currentTarget instanceof HTMLElement)) return;

    const pointer = this.pointerPosition(event, event.currentTarget);
    if (!pointer || pointer.radius < event.currentTarget.clientWidth * 0.12) return;

    let delta = pointer.angle - this.previousPointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const elapsed = Math.max(event.timeStamp - this.previousPointerTime, 1);
    this.angularVelocity = (delta / elapsed) * 1000;
    this.dragRotation.update((current) => current + delta);
    this.previousPointerAngle = pointer.angle;
    this.previousPointerTime = event.timeStamp;
  }

  protected finishDrag(): void {
    if (!this.isDragging()) return;

    const rotationDelta = this.dragRotation();
    if (Math.abs(rotationDelta) >= 8) {
      this.dragSpinRequested.emit({ rotationDelta, velocity: this.angularVelocity });
    }

    this.isDragging.set(false);
    this.dragRotation.set(0);
  }

  private pointerPosition(
    event: PointerEvent,
    element: HTMLElement,
  ): { angle: number; radius: number } | null {
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;

    const x = event.clientX - (bounds.left + bounds.width / 2);
    const y = event.clientY - (bounds.top + bounds.height / 2);
    return {
      angle: (Math.atan2(y, x) * 180) / Math.PI,
      radius: Math.hypot(x, y),
    };
  }

  private point(angle: number, radius: number): { x: number; y: number } {
    const radians = (angle * Math.PI) / 180;
    return {
      x: 200 + radius * Math.cos(radians),
      y: 200 + radius * Math.sin(radians),
    };
  }
}
