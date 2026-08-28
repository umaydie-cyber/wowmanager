import Phaser from 'phaser';

import { getBuildingDefinition } from '@/game/content/buildings';
import type {
  Building,
  BuildingDefinitionId,
  BuildingId,
  Fortress,
  Hero,
  Position,
} from '@/game/core/types';

const LOGICAL_WIDTH = 320;
const LOGICAL_HEIGHT = 180;
const CELL_SIZE = 18;
const GRID_X = (LOGICAL_WIDTH - CELL_SIZE * 8) / 2;
const GRID_Y = 18;
const POSITION_EPSILON = 0.000_001;

export interface FortressSceneSnapshot {
  fortress: Fortress;
  heroes: readonly Hero[];
  selectedCell: Position | null;
  selectedBuildingId: BuildingId | null;
  previewDefinitionId: BuildingDefinitionId | null;
}

export interface FortressCellClick {
  position: Position;
  buildingId: BuildingId | null;
}

export interface PhaserFortressGame {
  destroy: () => void;
  updateSnapshot: (snapshot: FortressSceneSnapshot) => void;
}

interface FortressSceneOptions {
  initialSnapshot: FortressSceneSnapshot;
  onCellClick: (click: FortressCellClick) => void;
}

const containsCell = (building: Building, cell: Position): boolean => {
  const footprint = getBuildingDefinition(building.definitionId).footprint;
  return (
    cell.x >= building.position.x &&
    cell.x < building.position.x + footprint.width.value &&
    cell.y >= building.position.y &&
    cell.y < building.position.y + footprint.height.value
  );
};

class FortressScene extends Phaser.Scene {
  private snapshot: FortressSceneSnapshot;

  constructor(private readonly options: FortressSceneOptions) {
    super({ key: 'fortress' });
    this.snapshot = options.initialSnapshot;
  }

  create(): void {
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.renderFortress();
  }

  updateSnapshot(snapshot: FortressSceneSnapshot): void {
    this.snapshot = snapshot;
    if (this.sys.isActive()) {
      this.renderFortress();
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const x = Math.floor((pointer.x - GRID_X) / CELL_SIZE);
    const y = Math.floor((pointer.y - GRID_Y) / CELL_SIZE);
    if (
      x < 0 ||
      y < 0 ||
      x >= this.snapshot.fortress.width ||
      y >= this.snapshot.fortress.height
    ) {
      return;
    }

    const position = { x, y };
    const building = this.snapshot.fortress.buildings.find((entry) =>
      containsCell(entry, position),
    );
    this.options.onCellClick({ position, buildingId: building?.id ?? null });
  }

  private renderFortress(): void {
    this.children.removeAll(true);

    const graphics = this.add.graphics();
    graphics.fillStyle(0x101724);
    graphics.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    this.drawTitle();
    this.drawGrid(graphics);
    this.snapshot.fortress.buildings.forEach((building) =>
      this.drawBuilding(graphics, building),
    );
    this.snapshot.heroes.forEach((hero) => this.drawHero(graphics, hero));
    this.drawSelection(graphics);
  }

  private drawTitle(): void {
    this.add
      .text(10, 5, '晨星要塞  ·  8 × 8', {
        color: '#f3c965',
        fontFamily: 'monospace',
        fontSize: '8px',
        resolution: 1,
      })
      .setResolution(1);
  }

  private drawGrid(graphics: Phaser.GameObjects.Graphics): void {
    const { width, height } = this.snapshot.fortress;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const left = GRID_X + x * CELL_SIZE;
        const top = GRID_Y + y * CELL_SIZE;
        graphics.fillStyle((x + y) % 2 === 0 ? 0x253b4d : 0x1e3346);
        graphics.fillRect(left, top, CELL_SIZE, CELL_SIZE);
        graphics.lineStyle(1, 0x456075, 1);
        graphics.strokeRect(left, top, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  private drawBuilding(graphics: Phaser.GameObjects.Graphics, building: Building): void {
    const definition = getBuildingDefinition(building.definitionId);
    const { width, height } = definition.footprint;
    const left = GRID_X + building.position.x * CELL_SIZE;
    const top = GRID_Y + building.position.y * CELL_SIZE;
    const drawWidth = width.value * CELL_SIZE;
    const drawHeight = height.value * CELL_SIZE;

    graphics.fillStyle(0x09121f, 0.8);
    graphics.fillRect(left + 2, top + 3, drawWidth - 2, drawHeight - 2);

    switch (building.definitionId) {
      case 'tent-basic':
        this.drawTent(graphics, left, top);
        break;
      case 'mine-basic':
        this.drawMine(graphics, left, top, drawWidth, drawHeight);
        break;
      case 'herb-garden-basic':
        this.drawHerbGarden(graphics, left, top, drawWidth, drawHeight);
        break;
      case 'gym-basic':
        this.drawGym(graphics, left, top, drawWidth, drawHeight);
        break;
      case 'insight-shrine-basic':
        this.drawInsightShrine(graphics, left, top, drawWidth, drawHeight);
        break;
    }
  }

  private drawTent(
    graphics: Phaser.GameObjects.Graphics,
    left: number,
    top: number,
  ): void {
    graphics.fillStyle(0x6b3536);
    graphics.fillTriangle(left + 2, top + 14, left + 9, top + 2, left + 16, top + 14);
    graphics.fillStyle(0xe2b45b);
    graphics.fillRect(left + 7, top + 10, 4, 5);
    graphics.fillStyle(0xd67a5e);
    graphics.fillRect(left + 8, top + 3, 2, 3);
  }

  private drawMine(
    graphics: Phaser.GameObjects.Graphics,
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    graphics.fillStyle(0x737a86);
    graphics.fillRect(left + 2, top + 5, width - 4, height - 7);
    graphics.fillStyle(0xa8b0b9);
    graphics.fillRect(left + 5, top + 3, width - 10, 4);
    graphics.fillStyle(0x142033);
    graphics.fillRect(left + Math.floor(width / 2) - 6, top + height - 11, 12, 9);
    graphics.fillStyle(0xf3c965);
    graphics.fillRect(left + 5, top + 10, 3, 3);
    graphics.fillRect(left + width - 8, top + 14, 3, 3);
  }

  private drawHerbGarden(
    graphics: Phaser.GameObjects.Graphics,
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    graphics.fillStyle(0x80533b);
    graphics.fillRect(left + 2, top + 2, width - 4, height - 4);
    graphics.fillStyle(0x417c4a);
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        graphics.fillRect(left + 5 + x * 9, top + 5 + y * 8, 4, 5);
        graphics.fillStyle(0x91d7bc);
        graphics.fillRect(left + 6 + x * 9, top + 3 + y * 8, 2, 3);
        graphics.fillStyle(0x417c4a);
      }
    }
  }

  private drawGym(
    graphics: Phaser.GameObjects.Graphics,
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    graphics.fillStyle(0x4d4b75);
    graphics.fillRect(left + 2, top + 4, width - 4, height - 6);
    graphics.fillStyle(0xc7b4eb);
    graphics.fillRect(left + 5, top + 3, width - 10, 4);
    graphics.fillStyle(0x1a1732);
    graphics.fillRect(left + 5, top + 14, width - 10, 4);
    graphics.fillStyle(0xf3c965);
    graphics.fillRect(left + Math.floor(width / 2) - 2, top + 8, 4, 15);
  }

  private drawInsightShrine(
    graphics: Phaser.GameObjects.Graphics,
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    graphics.fillStyle(0x392b59);
    graphics.fillRect(left + 2, top + 4, width - 4, height - 6);
    graphics.fillStyle(0xb77cff);
    graphics.fillTriangle(
      left + Math.floor(width / 2),
      top + 5,
      left + 8,
      top + height - 7,
      left + width - 8,
      top + height - 7,
    );
    graphics.fillStyle(0x91d7bc);
    graphics.fillRect(left + Math.floor(width / 2) - 2, top + 12, 4, 9);
  }

  private getHeroDirection(hero: Hero): 'up' | 'down' | 'left' | 'right' {
    const activity = hero.activity;
    if (activity.type !== 'TO_REST' && activity.type !== 'TO_WORK') {
      return 'down';
    }

    const target = this.snapshot.fortress.buildings.find(
      (building) => building.id === activity.buildingId,
    )?.position;
    if (target === undefined) {
      return 'down';
    }

    const xDistance = target.x - hero.position.x;
    if (Math.abs(xDistance) > POSITION_EPSILON) {
      return xDistance > 0 ? 'right' : 'left';
    }
    return target.y < hero.position.y ? 'up' : 'down';
  }

  private drawHero(graphics: Phaser.GameObjects.Graphics, hero: Hero): void {
    const direction = this.getHeroDirection(hero);
    const isMoving = hero.activity.type === 'TO_REST' || hero.activity.type === 'TO_WORK';
    const isWorking = hero.activity.type === 'WORKING';
    const isResting = hero.activity.type === 'RESTING';
    const animationFrame = Math.floor(this.time.now / 160) % 2;
    const stepOffset = isMoving && animationFrame === 0 ? 1 : 0;
    const centerX = Math.round(GRID_X + (hero.position.x + 0.5) * CELL_SIZE);
    const centerY = Math.round(GRID_Y + (hero.position.y + 0.5) * CELL_SIZE);
    const bodyColor =
      hero.id === 'hero-aelan' ? 0x7cc5ff : hero.id === 'hero-mira' ? 0xf198b4 : 0xb8e46b;

    graphics.fillStyle(0x09121f, 0.65);
    graphics.fillEllipse(centerX - 4, centerY + 5, 8, 3);

    if (isResting) {
      graphics.fillStyle(bodyColor);
      graphics.fillRect(centerX - 5, centerY + 1, 8, 3);
      graphics.fillStyle(0xf6f0d3);
      graphics.fillRect(centerX + 4, centerY, 2, 2);
      this.add
        .text(centerX + 4, centerY - 8 - animationFrame, 'z', {
          color: '#91d7bc',
          fontFamily: 'monospace',
          fontSize: '6px',
          resolution: 1,
        })
        .setResolution(1);
      return;
    }

    const bodyY = centerY - 2 + (isWorking && animationFrame === 0 ? 1 : 0);
    graphics.fillStyle(bodyColor);
    graphics.fillRect(centerX - 3, bodyY, 6, 6);
    graphics.fillStyle(0xf6d4b5);
    graphics.fillRect(centerX - 2, bodyY - 4, 4, 4);
    graphics.fillStyle(0x182236);
    graphics.fillRect(centerX - 2, bodyY + 6, 2, 2 + stepOffset);
    graphics.fillRect(centerX + 1, bodyY + 6, 2, 2 + (isMoving ? 1 - stepOffset : 0));

    // A one-pixel facing marker makes all four placeholder movement directions distinct.
    graphics.fillStyle(0xf3c965);
    switch (direction) {
      case 'up':
        graphics.fillRect(centerX - 1, bodyY - 5, 2, 1);
        break;
      case 'down':
        graphics.fillRect(centerX - 1, bodyY, 2, 1);
        break;
      case 'left':
        graphics.fillRect(centerX - 4, bodyY - 2, 1, 2);
        break;
      case 'right':
        graphics.fillRect(centerX + 3, bodyY - 2, 1, 2);
        break;
    }

    if (isWorking) {
      graphics.fillStyle(0xf3c965);
      graphics.fillRect(centerX + 4, bodyY - 1 - animationFrame * 2, 3, 2);
      graphics.lineStyle(1, 0xd9e2e9, 1);
      graphics.lineBetween(centerX + 3, bodyY + 2, centerX + 7, bodyY - 4);
    }
  }

  private drawSelection(graphics: Phaser.GameObjects.Graphics): void {
    const selectedBuilding = this.snapshot.fortress.buildings.find(
      (building) => building.id === this.snapshot.selectedBuildingId,
    );
    if (selectedBuilding !== undefined) {
      const footprint = getBuildingDefinition(selectedBuilding.definitionId).footprint;
      graphics.lineStyle(2, 0xf3c965, 1);
      graphics.strokeRect(
        GRID_X + selectedBuilding.position.x * CELL_SIZE + 1,
        GRID_Y + selectedBuilding.position.y * CELL_SIZE + 1,
        footprint.width.value * CELL_SIZE - 2,
        footprint.height.value * CELL_SIZE - 2,
      );
      return;
    }

    const { selectedCell, previewDefinitionId } = this.snapshot;
    if (selectedCell === null) {
      return;
    }

    const preview =
      previewDefinitionId === null
        ? null
        : getBuildingDefinition(previewDefinitionId).footprint;
    graphics.lineStyle(2, preview === null ? 0x91d7bc : 0xf3c965, 1);
    graphics.strokeRect(
      GRID_X + selectedCell.x * CELL_SIZE + 1,
      GRID_Y + selectedCell.y * CELL_SIZE + 1,
      (preview?.width.value ?? 1) * CELL_SIZE - 2,
      (preview?.height.value ?? 1) * CELL_SIZE - 2,
    );
  }
}

/**
 * Creates the low-resolution visual shell. It only receives immutable snapshots
 * and reports clicks; React owns selection while core commands own game mutations.
 */
export function createPhaserGame(
  parent: HTMLElement,
  initialSnapshot: FortressSceneSnapshot,
  onCellClick: (click: FortressCellClick) => void,
): PhaserFortressGame {
  const scene = new FortressScene({ initialSnapshot, onCellClick });
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    banner: false,
    audio: { noAudio: true },
    parent,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    backgroundColor: '#101724',
    scene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      autoRound: true,
    },
  });

  return {
    destroy: () => game.destroy(true),
    updateSnapshot: (snapshot) => scene.updateSnapshot(snapshot),
  };
}
