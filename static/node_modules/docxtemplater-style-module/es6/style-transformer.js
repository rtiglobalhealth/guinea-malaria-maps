const { setSingleAttribute } = require("./attributes");
const { xmlparse } = require("docxtemplater/js/lexer");
module.exports = function (xml, styleData, fileType) {
	xml = xmlparse(xml, {
		text: [],
		other: [
			"w:pStyle",
			"w:shd",
			"w:p",
			"w:pPr",
			"w:rPr",
			"w:bookmarkStart",
			"w:bookmarkEnd",
			"w:r",
			"a:tc",
			"a:txBody",
			"a:bodyPr",
			"a:noAutofit",
			"a:p",
			"a:pPr",
			"a:lnL",
			"a:lnR",
			"a:lnSpc",
			"a:spcPct",
			"a:r",
			"a:rPr",
			"a:solidFill",
			"a:srgbClr",
			"a:latin",
			"a:endParaRPr",
			"a:lnT",
			"a:lnB",
			"a:tcPr",
			"w:tcPr",
			"w:color",
		],
	});

	function createElement(tagName) {
		return [
			{
				type: "tag",
				position: "selfclosing",
				text: false,
				value: `<${tagName}/>`,
				tag: tagName,
			},
		];
	}
	function appendChild(parent, child) {
		if (!(child instanceof Array)) {
			child = [child];
		}

		if (parent instanceof Array) {
			throw new Error("appendChild should not use array");
		}
		let iii = xml.indexOf(parent);
		const isSelfClosing = parent.position === "selfclosing";
		if (isSelfClosing) {
			const el0Tag = parent.tag;
			parent.value = parent.value.replace(/\/>$/, ">");
			parent.position = "start";
			const endingTag = {
				type: "tag",
				position: "end",
				text: false,
				value: `</${el0Tag}>`,
				tag: el0Tag,
			};
			xml.splice(iii + 1, 0, ...child.concat(endingTag));
		} else {
			let next = null;
			while (next == null && iii < xml.length - 1) {
				iii++;
				const part = xml[iii];
				if (part.tag === parent.tag && part.position === "end") {
					next = part;
				}
			}

			xml.splice(iii, 0, ...child);
		}
	}
	// styleData = { textColor: "#449955"}
	function setAttr(el, attrName, attrValue) {
		if (el instanceof Array) {
			el[0].value = setSingleAttribute(el[0].value, attrName, attrValue);
		} else {
			el.value = setSingleAttribute(el.value, attrName, attrValue);
		}
	}
	function getOrCreate(element, tagName) {
		let found = false;
		element.some(function (part) {
			if (part.tag === tagName) {
				found = part;
				return true;
			}
		});
		if (found) {
			return found;
		}
		const newTag = {
			type: "tag",
			position: "selfclosing",
			text: false,
			value: `<${tagName}/>`,
			tag: tagName,
		};
		appendChild(element[0], newTag);
		return newTag;
	}
	function getDirectChildOrCreate(element, tagName) {
		let found = false;
		let level = 0;
		element.some(function (part) {
			if (
				part.tag === tagName &&
				part.position === "selfclosing" &&
				level === 1
			) {
				found = part;
				return true;
			}
			if (part.position === "start") {
				level++;
				if (part.tag === tagName && level === 2) {
					found = part;
					return true;
				}
			}
			if (part.position === "end") {
				level--;
			}
		});
		if (found) {
			return found;
		}
		const newTag = {
			type: "tag",
			position: "selfclosing",
			text: false,
			value: `<${tagName}/>`,
			tag: tagName,
		};
		appendChild(element[0], newTag);
		return newTag;
	}
	function removeAllChildren(element) {
		const start = xml.indexOf(element);

		if (element.position !== "start") {
			return;
		}

		let end = start;
		while (end < xml.length - 1) {
			end++;
			const part = xml[end];
			if (part.tag === element.tag && part.position === "end") {
				xml.splice(start + 1, end - start - 1);
				return;
			}
		}
	}
	function forEachTag(tagName, fn) {
		const interestingParts = [];
		for (let i = 0, len = xml.length; i < len; i++) {
			const part = xml[i];
			const { type, position, tag } = part;
			if (type === "tag" && position === "selfclosing" && tag === tagName) {
				interestingParts.push([part]);
				continue;
			}
			if (type === "tag" && position === "start" && tag === tagName) {
				interestingParts.push([part]);
			}
			if (type === "tag" && position === "end" && tag === tagName) {
				interestingParts[interestingParts.length - 1].push(part);
			}
		}
		interestingParts.forEach(function (parts) {
			if (parts.length === 1) {
				fn(parts);
			} else {
				const startIndex = xml.indexOf(parts[0]);
				const endIndex = xml.indexOf(parts[1]);
				fn(xml.slice(startIndex, endIndex + 1));
			}
		});
		return xml;
	}

	if (styleData.cellBackground) {
		const fill = styleData.cellBackground.substr(1).toUpperCase();
		if (fileType === "docx") {
			forEachTag("w:tcPr", function (cellProp) {
				const shade = getOrCreate(cellProp, "w:shd");
				setAttr(shade, "w:fill", fill);
			});
		}
		if (fileType === "pptx") {
			forEachTag("a:tcPr", function (cellProp) {
				const shade = getDirectChildOrCreate(cellProp, "a:solidFill");
				const srgb = createElement("a:srgbClr");
				setAttr(srgb, "val", fill);
				removeAllChildren(shade);
				appendChild(shade, srgb);
			});
		}
	}
	if (styleData.textColor) {
		const colorText = styleData.textColor.substr(1).toUpperCase();
		if (fileType === "docx") {
			forEachTag("w:rPr", function (runProp) {
				const color = getOrCreate(runProp, "w:color");
				setAttr(color, "w:val", colorText);
			});
		}
		if (fileType === "pptx") {
			forEachTag("a:rPr", function (runProp) {
				const shade = getDirectChildOrCreate(runProp, "a:solidFill");
				removeAllChildren(shade);
				const srgb = createElement("a:srgbClr");
				setAttr(srgb, "val", colorText);
				appendChild(shade, srgb);
			});
		}
	}
	if (styleData.fontFamily) {
		const fontFamily = styleData.fontFamily;
		if (fileType === "docx") {
			forEachTag("w:rPr", function (runProp) {
				const el = getOrCreate(runProp, "w:rFonts");
				setAttr(el, "w:ascii", fontFamily);
				setAttr(el, "w:hAnsi", fontFamily);
			});
		}
		if (fileType === "pptx") {
			forEachTag("a:rPr", function (runProp) {
				const latin = getDirectChildOrCreate(runProp, "a:latin");
				setAttr(latin, "typeface", fontFamily);
			});
		}
	}
	if (styleData.pStyle && fileType === "docx") {
		const pStyle = styleData.pStyle;
		forEachTag("w:pPr", function (parProp) {
			const el = getOrCreate(parProp, "w:pStyle");
			setAttr(el, "w:val", pStyle);
		});
	}
	return xml
		.map(function ({ value }) {
			return value;
		})
		.join("");
};
