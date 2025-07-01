include make-*.mk

build:
	vsce package

install:
	code --install-extension sitedog-preview-0.1.0.vsix

publish:
	vsce publish

login:
	vsce login

#sitedog