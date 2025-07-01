include make-*.mk

build:
	npm run compile
	vsce package

install:
	code --install-extension $$(ls -t sitedog-preview-*.vsix | head -1)

publish:
	vsce publish

login:
	vsce login nemytchenko

#sitedog
