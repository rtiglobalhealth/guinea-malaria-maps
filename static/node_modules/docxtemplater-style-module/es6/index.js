const verifyApiVersion = require("./api-verify");
const {
	traits,
	mergeObjects,
	concatArrays,
} = require("docxtemplater").DocUtils;

const moduleNameCell = "pro-xml-templating/style-cell";
const moduleNameRow = "pro-xml-templating/style-row";
const moduleNameParagraph = "pro-xml-templating/style-paragraph";

const modules = {
	cell: moduleNameCell,
	paragraph: moduleNameParagraph,
	row: moduleNameRow,
};

function getValues(obj) {
	return Object.keys(obj).map(function (key) {
		return obj[key];
	});
}

const moduleNames = getValues(modules);

const styleTransformer = require("./style-transformer");

function getInner({ part, leftParts, rightParts, postparse }) {
	part.subparsed = postparse(concatArrays([leftParts, rightParts]));
	return part;
}

class StyleModule {
	constructor(options) {
		this.requiredAPIVersion = "3.24.0";
		this.supportedFileTypes = ["docx", "pptx"];
		this.options = options || {};
		this.name = "StyleModule";
		this.prefix = {
			cell: ":stylecell",
			paragraph: ":stylepar",
			row: ":stylerow",
		};
	}
	set(options) {
		if (options.xmlDocuments) {
			this.xmlDocuments = options.xmlDocuments;
		}
	}
	optionsTransformer(options, docxtemplater) {
		verifyApiVersion(docxtemplater, this.requiredAPIVersion);
		this.fileType = docxtemplater.fileType;
		const relsFiles = docxtemplater.zip
			.file(/numbering.xml/)
			.concat(docxtemplater.zip.file(/\[Content_Types\].xml/))
			.concat(docxtemplater.zip.file(/word\/styles\.xml/))
			.concat(docxtemplater.zip.file(/document.xml.rels/))
			.map((file) => file.name);

		options.xmlFileNames = options.xmlFileNames.concat(relsFiles);
		docxtemplater.fileTypeConfig.tagsXmlLexedArray.push(
			"w:ascii",
			"w:color",
			"w:fill",
			"w:hAnsi",
			"w:pPr",
			"w:rFonts",
			"w:rPr",
			"w:shd",
			"w:spacing",
			"w:tcPr",
			"w:tcW",
			"w:tr",
			"w:tc",
			"a:tc",
			"a:tr",
			"w:val"
		);
		return options;
	}

	parse(placeHolderContent) {
		const type = "placeholder";
		let module;
		const candidates = Object.keys(modules);
		for (let i = 0, len = candidates.length; i < len; i++) {
			const candidate = candidates[i];
			if (placeHolderContent.indexOf(this.prefix[candidate]) === 0) {
				module = modules[candidate];
				return {
					type,
					value: placeHolderContent.substr(this.prefix[candidate].length + 1),
					module,
				};
			}
		}
		return null;
	}
	postparse(parsed, { postparse }) {
		if (this.fileType === "docx") {
			parsed = traits.expandToOne(parsed, {
				moduleName: moduleNameRow,
				getInner,
				expandTo: "w:tr",
				postparse,
			});
			parsed = traits.expandToOne(parsed, {
				moduleName: moduleNameCell,
				getInner,
				expandTo: "w:tc",
				postparse,
			});
			parsed = traits.expandToOne(parsed, {
				moduleName: moduleNameParagraph,
				getInner,
				expandTo: "w:p",
				postparse,
			});
		}
		if (this.fileType === "pptx") {
			parsed = traits.expandToOne(parsed, {
				moduleName: moduleNameRow,
				getInner,
				expandTo: "a:tr",
				postparse,
			});
			parsed = traits.expandToOne(parsed, {
				moduleName: moduleNameCell,
				getInner,
				expandTo: "a:tc",
				postparse,
			});
			parsed = traits.expandToOne(parsed, {
				moduleName: moduleNameParagraph,
				getInner,
				expandTo: "a:p",
				postparse,
			});
		}
		return parsed;
	}
	render(part, options) {
		if (
			part.type !== "placeholder" ||
			moduleNames.indexOf(part.module) === -1
		) {
			return null;
		}
		const styleData = options.scopeManager.getValue(part.value, { part }) || {};
		let totalValue = [];
		let errors = [];
		const parts = concatArrays(part.expanded);
		const subRendered = options.render(
			mergeObjects({}, options, {
				compiled: parts,
				tags: {},
				scopeManager: options.scopeManager,
			})
		);
		totalValue = totalValue.concat(subRendered.parts);
		const strValue = totalValue.join("");

		const value = styleTransformer(strValue, styleData, this.fileType);

		errors = errors.concat(subRendered.errors || []);
		return { value, errors };
	}

	resolve(part, options) {
		if (
			part.type !== "placeholder" ||
			moduleNames.indexOf(part.module) === -1
		) {
			return null;
		}

		const sm = options.scopeManager;
		const promisedValue = Promise.resolve().then(function () {
			return sm.getValue(part.value, { part });
		});
		// const promises = [];
		// function loopOver(scope, i, length) {
		// 	const scopeManager = sm.createSubScopeManager(
		// 		scope,
		// 		part.value,
		// 		i,
		// 		part,
		// 		length
		// 	);
		// 	promises.push(
		// 		options.resolve({
		// 			filePath: options.filePath,
		// 			modules: options.modules,
		// 			baseNullGetter: options.baseNullGetter,
		// 			resolve: options.resolve,
		// 			compiled: part.subparsed,
		// 			tags: {},
		// 			scopeManager,
		// 		})
		// 	);
		// }
		// const errorList = [];
		return promisedValue.then(function (value) {
			return options
				.resolve({
					filePath: options.filePath,
					modules: options.modules,
					baseNullGetter: options.baseNullGetter,
					resolve: options.resolve,
					compiled: part.subparsed,
					tags: {},
					scopeManager: sm,
				})
				.then(function (res) {
					return [value].concat(res);
				});
			// sm.loopOverValue(value, loopOver, part.inverted);
			// return Promise.all(promises)
			// 	.then(function (r) {
			// 		return r.map(function ({ resolved, errors }) {
			// 			if (errors.length > 0) {
			// 				errorList.push(...errors);
			// 			}
			// 			return resolved;
			// 		});
			// 	})
			// 	.then(function (value) {
			// 		if (errorList.length > 0) {
			// 			throw errorList;
			// 		}
			// 		return value;
			// 	});
		});
	}
}

module.exports = StyleModule;
