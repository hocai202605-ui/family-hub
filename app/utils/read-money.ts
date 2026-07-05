const textNumbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readGroup(group: number, full: boolean) {
    const str = group.toString().padStart(3, '0');
    let result = '';
    const h = parseInt(str[0], 10);
    const t = parseInt(str[1], 10);
    const u = parseInt(str[2], 10);

    if (h > 0 || full) {
        result += textNumbers[h] + ' trăm ';
    }
    
    if (t === 0 && u > 0) {
        if (h > 0 || full) result += 'lẻ ';
    } else if (t === 1) {
        result += 'mười ';
    } else if (t > 1) {
        result += textNumbers[t] + ' mươi ';
    }

    if (u === 1 && t > 1) {
        result += 'mốt ';
    } else if (u === 4 && t > 1) {
        result += 'tư ';
    } else if (u === 5 && t > 0) {
        result += 'lăm ';
    } else if (u > 0 || (u === 0 && t === 0 && h === 0 && !full)) {
        if (u > 0) {
            result += textNumbers[u] + ' ';
        }
    }

    return result.trim();
}

export function readMoney(numberStr: string) {
    if (!numberStr) return '';
    const num = parseInt(numberStr, 10);
    if (isNaN(num)) return '';
    if (num === 0) return 'Không đồng';

    const str = num.toString();
    const groups = [];
    for (let i = str.length; i > 0; i -= 3) {
        groups.push(str.substring(Math.max(0, i - 3), i));
    }

    const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
    let result = '';

    for (let i = 0; i < groups.length; i++) {
        const group = parseInt(groups[i], 10);
        if (group > 0) {
            // Check if full is needed: only if it's not the highest group
            const full = i < groups.length - 1 && num >= Math.pow(10, i * 3 + 3);
            const groupText = readGroup(group, full);
            result = groupText + ' ' + units[i] + ' ' + result;
        }
    }

    result = result.trim().replace(/\s+/g, ' ');
    return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}
