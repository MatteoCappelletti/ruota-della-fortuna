import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { EntryList } from './features/entries/entries';
import { Wheel, type WheelDrag } from './features/wheel/wheel';

const STORAGE_KEY = 'fortuna-wheel-entries';
const THEME_STORAGE_KEY = 'fortuna-wheel-theme';
const DEFAULT_ENTRIES = ['Un caffè', 'Pausa pranzo', 'Gelato', 'Sorpresa', 'Cinema', 'Buona fortuna'];

type Theme = 'light' | 'dark';

@Component({
  imports: [EntryList, Wheel],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly document = inject(DOCUMENT);
  protected readonly theme = signal<Theme>(this.loadTheme());
  protected readonly strengthLevels = [
    { value: 1, label: 'Soft', dots: '●' },
    { value: 2, label: 'Media', dots: '●●' },
    { value: 3, label: 'Turbo', dots: '●●●' },
  ];
  protected readonly storageMessage = signal('');
  protected readonly entries = signal(this.loadInitialEntries());
  protected readonly winner = signal<string | null>(null);
  protected readonly winnerHistory = signal<string[]>([]);
  protected readonly winnerPopupOpen = signal(false);
  protected readonly isSpinning = signal(false);
  protected readonly strength = signal(2);
  protected readonly rotation = signal(0);
  protected readonly spinDuration = computed(
    () => this.dragDuration() ?? 2600 + (this.strength() - 1) * 1000,
  );
  private readonly dragDuration = signal<number | null>(null);
  private readonly pendingWinnerIndex = signal<number | null>(null);
  private readonly winnerIndex = signal<number | null>(null);

  constructor() {
    this.applyTheme(this.theme());
  }

  protected toggleTheme(): void {
    const nextTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(nextTheme);
    this.applyTheme(nextTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      this.storageMessage.set('Tema aggiornato, ma non è stato possibile salvarlo nel browser.');
    }
  }

  protected addEntry(entry: string): void {
    const trimmed = entry.trim();
    if (!trimmed || this.isSpinning()) return;

    this.entries.update((current) => [...current, trimmed]);
    this.winner.set(null);
    this.winnerIndex.set(null);
    this.storageMessage.set('');
  }

  protected removeEntry(index: number): void {
    if (this.isSpinning()) return;

    this.entries.update((current) => current.filter((_, entryIndex) => entryIndex !== index));
    const selectedIndex = this.winnerIndex();
    if (selectedIndex === index) {
      this.winner.set(null);
      this.winnerIndex.set(null);
    } else if (selectedIndex !== null && index < selectedIndex) {
      this.winnerIndex.set(selectedIndex - 1);
    }
    this.storageMessage.set('');
  }

  protected spin(): void {
    const options = this.entries();
    if (!options.length || this.isSpinning()) return;

    const selectedIndex = Math.floor(Math.random() * options.length);
    const sliceAngle = 360 / options.length;
    const selectedMidpoint = -90 + (selectedIndex + 0.5) * sliceAngle;
    const desiredRotation = ((-90 - selectedMidpoint) % 360 + 360) % 360;
    const currentRotation = ((this.rotation() % 360) + 360) % 360;
    const alignment = (desiredRotation - currentRotation + 360) % 360;
    const turns = 4 + this.strength() * 3;

    this.pendingWinnerIndex.set(selectedIndex);
    this.winner.set(null);
    this.winnerPopupOpen.set(false);
    this.winnerIndex.set(null);
    this.isSpinning.set(true);
    this.dragDuration.set(null);
    this.rotation.update((current) => current + turns * 360 + alignment);
  }

  protected spinFromDrag(drag: WheelDrag): void {
    const options = this.entries();
    if (!options.length || this.isSpinning()) return;

    const currentRotation = this.rotation() + drag.rotationDelta;
    const dragForce = Math.max(Math.abs(drag.velocity), Math.abs(drag.rotationDelta) * 2);
    const turns = Math.min(12, 3 + this.strength() - 1 + Math.round(dragForce / 240));
    const angularSpeed = 360 + Math.min(dragForce / 1200, 1) * 1440;
    const duration = Math.max(900, Math.min(6500, (turns * 360 * 1000) / angularSpeed));
    const targetRotation = currentRotation + Math.sign(drag.rotationDelta) * turns * 360;
    const pointerAngle = ((-targetRotation % 360) + 360) % 360;
    const selectedIndex = Math.min(
      options.length - 1,
      Math.floor(pointerAngle / (360 / options.length)),
    );

    this.pendingWinnerIndex.set(selectedIndex);
    this.winner.set(null);
    this.winnerPopupOpen.set(false);
    this.winnerIndex.set(null);
    this.isSpinning.set(true);
    this.dragDuration.set(duration);
    this.rotation.set(targetRotation);
  }

  protected finishSpin(): void {
    const selectedIndex = this.pendingWinnerIndex();
    if (selectedIndex === null) return;

    const selectedWinner = this.entries()[selectedIndex] ?? null;
    this.winner.set(selectedWinner);
    this.winnerIndex.set(selectedIndex);
    this.pendingWinnerIndex.set(null);
    this.isSpinning.set(false);
    this.dragDuration.set(null);
    if (selectedWinner !== null) {
      this.winnerHistory.update((current) => [selectedWinner, ...current]);
      this.winnerPopupOpen.set(true);
    }
  }

  protected dismissWinnerPopup(): void {
    this.winnerPopupOpen.set(false);
  }

  protected excludeWinner(): void {
    const selectedIndex = this.winnerIndex();
    if (selectedIndex === null || this.isSpinning()) return;

    this.entries.update((current) => current.filter((_, index) => index !== selectedIndex));
    this.winner.set(null);
    this.winnerIndex.set(null);
    if (this.entries().length) this.spin();
  }

  protected saveEntries(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()));
      this.storageMessage.set('Lista salvata su questo dispositivo.');
    } catch {
      this.storageMessage.set('Non è stato possibile salvare la lista nel browser.');
    }
  }

  protected restoreEntries(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      this.entries.set(saved === null ? [...DEFAULT_ENTRIES] : this.parseEntries(saved));
      this.clearSelection();
      this.storageMessage.set(saved === null ? 'Lista standard ripristinata.' : 'Lista salvata ripristinata.');
    } catch {
      this.storageMessage.set('Non è stato possibile leggere la lista salvata.');
    }
  }

  private loadInitialEntries(): string[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === null ? [...DEFAULT_ENTRIES] : this.parseEntries(saved);
    } catch {
      this.storageMessage.set('Impossibile leggere la lista salvata: uso le opzioni standard.');
      return [...DEFAULT_ENTRIES];
    }
  }

  private loadTheme(): Theme {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  private applyTheme(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }

  private parseEntries(saved: string): string[] {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === 'string')) {
      throw new Error('Il formato della lista salvata non è valido.');
    }
    return parsed.map((entry: string) => entry.trim()).filter(Boolean);
  }

  private clearSelection(): void {
    this.winner.set(null);
    this.winnerPopupOpen.set(false);
    this.winnerIndex.set(null);
    this.pendingWinnerIndex.set(null);
    this.isSpinning.set(false);
  }
}
