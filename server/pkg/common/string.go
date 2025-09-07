package common

func JoinWithSpace(items []string) string {
	if len(items) == 0 {
		return ""
	}
	result := items[0]
	for _, s := range items[1:] { // ranged loop per preference
		result += " " + s
	}
	return result
}
