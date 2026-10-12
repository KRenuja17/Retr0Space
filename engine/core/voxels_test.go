package core

import (
	"reflect"
	"testing"
)

func TestVoxelTerrainIsDeterministicAndBounded(t *testing.T) {
	terrain := VoxelTerrain(73, 26)
	if !reflect.DeepEqual(terrain, VoxelTerrain(73, 26)) {
		t.Fatal("Voxel terrain changed for the same seed")
	}
	if reflect.DeepEqual(terrain, VoxelTerrain(74, 26)) {
		t.Fatal("Seed must affect terrain detail")
	}
	if len(terrain)%4 != 0 || len(terrain) < 4000 || len(terrain) > 100000 {
		t.Fatal("Unexpected surface size")
	}
	seen := map[[3]int]bool{}
	for i := 0; i < len(terrain); i += 4 {
		x, y, z, color := terrain[i], terrain[i+1], terrain[i+2], terrain[i+3]
		if x < -28 || x > 28 || z < -28 || z > 28 || y < -28 || y > 8 || color < 0 || color > 7 {
			t.Fatal("Invalid voxel")
		}
		position := [3]int{x, y, z}
		if seen[position] {
			t.Fatal("Duplicate voxel")
		}
		seen[position] = true
	}
	if seen[[3]int{0, 0, 0}] {
		t.Fatal("Interior cells should not reach the renderer")
	}
	if !reflect.DeepEqual(VoxelTerrain(73, 9999), VoxelTerrain(73, 28)) {
		t.Fatal("Unbounded geometry allocation")
	}
}
