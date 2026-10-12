package core

import "math"

// VoxelTerrain returns only the exposed cells of a solid floating island.
// Each record is x, y, z, palette index. Keeping interior cells out makes the
// detailed scene practical on mobile GPUs without changing its silhouette.
func VoxelTerrain(seed, radius int) []int {
	if radius < 6 {
		radius = 6
	}
	if radius > 28 {
		radius = 28
	}
	type column struct {
		top, bottom int
		water       bool
	}
	columns := map[[2]int]column{}
	hash := func(x, y, z int) uint32 {
		n := uint32(x*374761393 + y*668265263 + z*1274126177 + seed*31)
		n = (n ^ (n >> 13)) * 1274126177
		return n ^ (n >> 16)
	}
	for x := -radius; x <= radius; x++ {
		for z := -radius; z <= radius; z++ {
			r := math.Sqrt(float64(x*x)/float64(radius*radius) + float64(z*z)/float64(radius*radius)*1.18)
			edge := 1 + .035*math.Sin(float64(x)*.9+float64(seed)) + .025*math.Cos(float64(z)*1.3)
			if r > edge {
				continue
			}
			top := 2 + int(math.Round(1.1*math.Sin(float64(x)*.21)+math.Cos(float64(z)*.19)))
			if math.Abs(float64(x)) < float64(radius)*.47 && math.Abs(float64(z)) < float64(radius)*.42 {
				top = 4
			}
			stream := -float64(radius)*.38 + math.Sin(float64(z)*.15)*2
			water := math.Abs(float64(x)-stream) < 1.6
			if water {
				top = 1
			}
			depth := 3 + int(math.Pow(math.Max(0, 1-r), .68)*float64(radius)*.72) + int(hash(x, 0, z)%3)
			columns[[2]int{x, z}] = column{top, -depth, water}
		}
	}
	result := make([]int, 0, len(columns)*20)
	// Iterate in coordinate order; map iteration must not affect geometry.
	for x := -radius; x <= radius; x++ {
		for z := -radius; z <= radius; z++ {
			c, ok := columns[[2]int{x, z}]
			if !ok {
				continue
			}
			for y := c.bottom; y <= c.top; y++ {
				exposed := y == c.top || y == c.bottom
				for _, offset := range [4][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}} {
					n, exists := columns[[2]int{x + offset[0], z + offset[1]}]
					if !exists || y < n.bottom || y > n.top {
						exposed = true
					}
				}
				if !exposed {
					continue
				}
				color := 2 + int(hash(x, y, z)%4)
				if y == c.top {
					color = int(hash(x, y, z) % 2)
					if c.water {
						color = 7
					}
				}
				if y < -9 && hash(x, y, z)%3 != 0 {
					color = 6
				}
				result = append(result, x, y, z, color)
			}
		}
	}
	return result
}
