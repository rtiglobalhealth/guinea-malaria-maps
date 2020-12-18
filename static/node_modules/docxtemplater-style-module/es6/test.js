const expect = require("chai").expect;
const path = require("path");
const {
	shouldBeSame,
	setExamplesDirectory,
	createDoc,
	createDocV4,
	setStartFunction,
	start,
} = require("docxtemplater/js/tests/utils");

const StyleModule = require("./index.js");
const styleTransformer = require("./style-transformer");

let SlidesModule;
try {
	SlidesModule = require("../../slides/es6/index");
} catch (e) {
	/* eslint-disable no-console */
	console.log(JSON.stringify({ msg: "slides module tests skipped" }));
	/* eslint-enable no-console */
}
let options, data, expectedName, name, v4, withSlidesModule, async;

function testStart() {
	beforeEach(function () {
		async = false;
		v4 = false;
		withSlidesModule = false;
		options = {};
		this.expectedText = null;
		this.loadAndRender = function () {
			const styleModule = new StyleModule(options);
			const modules = [styleModule];
			if (withSlidesModule) {
				modules.push(new SlidesModule());
			}
			if (v4) {
				this.doc = createDocV4(name, { modules });
			} else {
				this.doc = createDoc(name);
				modules.forEach((module) => {
					this.doc.attachModule(module);
				});
			}
			if (async) {
				this.doc.setData({});
				this.doc.compile();
				return this.doc.resolveData(data).then(() => {
					// this.doc.setData(data);
					this.renderedDoc = this.doc.render();
					const doc = this.renderedDoc;
					shouldBeSame({ doc, expectedName });
				});
			}
			this.doc.setData(data);
			this.renderedDoc = this.doc.render();
			if (this.expectedText !== null) {
				expect(this.doc.getFullText()).to.equal(this.expectedText);
			}
			shouldBeSame({ doc: this.renderedDoc, expectedName });
		};
	});

	describe("Style row", function () {
		it("should work", function () {
			name = "style-row.docx";
			expectedName = "expected-style-row.docx";
			data = {
				name: "John",
				first: {
					cellBackground: "#00ff00",
					textColor: "#ffffff",
				},
			};
			this.loadAndRender();
		});

		it("should work with pptx", function () {
			name = "style-row.pptx";
			expectedName = "expected-style-row.pptx";
			data = {
				name: "John",
				first: {
					cellBackground: "#00ff00",
					textColor: "#ffffff",
				},
			};
			this.loadAndRender();
		});

		// it("should work with pptx async", function () {
		// 	async = true;
		// 	name = "style-row.pptx";
		// 	expectedName = "expected-style-row.pptx";
		// 	data = {
		// 		name: "John",
		// 		first: {
		// 			cellBackground: "#00ff00",
		// 			textColor: "#ffffff",
		// 		},
		// 	};
		// 	return this.loadAndRender();
		// });
	});

	describe("Style cell", function () {
		it("should work", function () {
			name = "style-example.docx";
			expectedName = "expected-style-example.docx";
			data = {
				nb: 10,
				label: "Hello",
				style: {
					cellBackground: "#00ff00",
					textColor: "#ffffff",
				},
			};
			this.loadAndRender();
		});

		it("should work with pptx", function () {
			name = "stylecell.pptx";
			expectedName = "expected-stylecell.pptx";
			data = {
				nb: 10,
				label: "Hello",
				style: {
					cellBackground: "#00ff00",
					fontFamily: "Bahnschrift",
					textColor: "#0000ff",
				},
			};
			this.loadAndRender();
		});

		it("should work with v4", function () {
			v4 = true;
			name = "style-example.docx";
			expectedName = "expected-style-example.docx";
			data = {
				nb: 10,
				label: "Hello",
				style: {
					cellBackground: "#00ff00",
					textColor: "#ffffff",
				},
			};
			this.loadAndRender();
		});

		it("should work without having any tags", function () {
			name = "style-without-tags.docx";
			expectedName = "expected-style-without-tags.docx";
			data = {
				nb: 10,
				label: "Hello",
				style: {
					cellBackground: "#00ff00",
					textColor: "#ffffff",
				},
			};
			this.loadAndRender();
		});
	});

	describe("Paragraph", function () {
		it("should work with paragraph style", function () {
			name = "style-par-example.docx";
			expectedName = "expected-par-changed.docx";
			data = {
				font: {
					fontFamily: "Bahnschrift",
					textColor: "#554499",
				},
				font2: {
					fontFamily: "Calibri",
					textColor: "#449955",
				},
			};
			this.loadAndRender();
		});

		it("should be possible to change pStyle", function () {
			name = "style-par-example.docx";
			expectedName = "expected-par-pstyle.docx";
			data = {
				font: {
					pStyle: "Heading",
				},
				font2: {
					pStyle: "Caption",
				},
			};
			this.loadAndRender();
		});
	});

	describe("style transformer", function () {
		it("should work for textColor", function () {
			const styleData = {
				textColor: "#554499",
			};
			const xml = `<w:p>
<w:pPr>
<w:rPr/>
</w:pPr>
<w:r>
<w:rPr/>
<w:t></w:t>
</w:r>
</w:p>`;

			const result = styleTransformer(xml, styleData, "docx", false);
			expect(result).to.equal(`<w:p>
<w:pPr>
<w:rPr><w:color w:val="554499"/></w:rPr>
</w:pPr>
<w:r>
<w:rPr><w:color w:val="554499"/></w:rPr>
<w:t></w:t>
</w:r>
</w:p>`);
		});

		it("should work for font + color", function () {
			const styleData = {
				textColor: "#554499",
				fontFamily: "Bahnschrift",
			};
			const xml = `<w:p>
<w:pPr>
<w:rPr/>
</w:pPr>
<w:r>
<w:rPr/>
<w:t></w:t>
</w:r>
</w:p>`;

			const result = styleTransformer(xml, styleData, "docx", false);
			expect(result).to.equal(`<w:p>
<w:pPr>
<w:rPr><w:color w:val="554499"/><w:rFonts w:ascii="Bahnschrift" w:hAnsi="Bahnschrift"/></w:rPr>
</w:pPr>
<w:r>
<w:rPr><w:color w:val="554499"/><w:rFonts w:ascii="Bahnschrift" w:hAnsi="Bahnschrift"/></w:rPr>
<w:t></w:t>
</w:r>
</w:p>`);
		});

		it("should work for table rows", function () {
			const styleData = {
				cellBackground: "#00ff00",
				textColor: "#ffffff",
			};
			const xml = `
<a:tr h="365760">
    <a:tc>
        <a:txBody>
            <a:bodyPr/>
            <a:p>
                <a:pPr>
                    <a:buNone/>
                </a:pPr>
                <a:r>
                    <a:rPr lang="" altLang="en-US"/>
                    <a:t>Hello John</a:t>
                </a:r>
                <a:endParaRPr lang="" altLang="en-US"/>
            </a:p>
        </a:txBody>
        <a:tcPr/>
    </a:tc>
    <a:tc>
        <a:txBody>
            <a:bodyPr/>
            <a:p>
                <a:pPr>
                    <a:buNone/>
                </a:pPr>
                <a:r>
                    <a:rPr lang="" altLang="en-US"/>
                    <a:t>Bye</a:t>
                </a:r>
                <a:endParaRPr lang="" altLang="en-US"/>
            </a:p>
        </a:txBody>
        <a:tcPr/>
    </a:tc>
</a:tr>
			`;

			const result = styleTransformer(xml, styleData, "pptx", false);
			expect(result).to.equal(`
<a:tr h="365760">
    <a:tc>
        <a:txBody>
            <a:bodyPr/>
            <a:p>
                <a:pPr>
                    <a:buNone/>
                </a:pPr>
                <a:r>
                    <a:rPr lang="" altLang="en-US"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr>
                    <a:t>Hello John</a:t>
                </a:r>
                <a:endParaRPr lang="" altLang="en-US"/>
            </a:p>
        </a:txBody>
        <a:tcPr><a:solidFill><a:srgbClr val="00FF00"/></a:solidFill></a:tcPr>
    </a:tc>
    <a:tc>
        <a:txBody>
            <a:bodyPr/>
            <a:p>
                <a:pPr>
                    <a:buNone/>
                </a:pPr>
                <a:r>
                    <a:rPr lang="" altLang="en-US"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr>
                    <a:t>Bye</a:t>
                </a:r>
                <a:endParaRPr lang="" altLang="en-US"/>
            </a:p>
        </a:txBody>
        <a:tcPr><a:solidFill><a:srgbClr val="00FF00"/></a:solidFill></a:tcPr>
    </a:tc>
</a:tr>
			`);
		});
	});
}

setExamplesDirectory(path.resolve(__dirname, "..", "examples"));
setStartFunction(testStart);
start();
