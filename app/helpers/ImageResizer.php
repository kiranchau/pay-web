<?php

class ImageResizer {

	const UNIFORM = 1; // Both the height and width fit within the desired size maintaining the aspect ratio
	const UNIFORM_FILL = 2; // Aspect ratio is maintained with the entire box filled
	
	private $width, $height;
	private $image = array();
	
	public function __construct($width=null, $height=null)	{
		if ($width && $height)
			$this->setSize($width, $height);		
		$this->stretch = self::UNIFORM;
	}
	
	public function setSize($width, $height) {
		$this->width = $width;
		$this->height = $height;
		return $this;
	}

	public function setStretch($stretch) {
		$this->stretch = $stretch;
	}
	
	public function resize($source, $destination)	{
		$this->setDetails($source);
		
		if ($this->image['width'] <= $this->width && $this->image['height'] <= $this->height) {
			copy($source, $destination);
			return;
		}
		
		$this->performResize($destination);
	
		return $this;
	}

	public function crop($source, $destination) {
		$oldwidth = $this->width;
		$oldheight = $this->height;

		$larger = $oldwidth > $oldheight ? $oldwidth : $oldheight;
		
		$this->setSize($larger, $larger);
		$this->setStretch(self::UNIFORM_FILL);
		if ($this->resize($source, $destination)) {
			$this->setSize($oldwidth, $oldheight);
			$this->setDetails($destination);
			$this->performCrop($destination);
		}
	}

	private function performCrop($dest) {
		$old = $this->createImage();
		$new = $this->createNewImage($this->width, $this->height);
		$left = 0;
		if ($this->width < $this->image['width']) {
			$w = $this->image['width'];
			$left = floor($w / 2) - floor($this->width / 2);
		}

		$top = 0;
		if ($this->height < $this->image['height']) {
			$h = $this->image['height'];
			$top = floor($h / 2) - floor($this->height / 2);
		}
		if ($this->image['mime'] == 'image/png') {
			imagealphablending($new, false);
			imagesavealpha($new, true);
		}

		imagecopyresampled($new, $old, 0, 0, $left, $top, $this->width, $this->height, $this->width, $this->height);
		$this->saveImage($new, $dest);
		imagedestroy($old);
		imagedestroy($new);
	}
	
	private function performResize($dest)	{
		$old = $this->createImage();
		list($w, $h) = $this->getResizeDimensions();
		$new = $this->createNewImage($w, $h);
		if ($this->image['mime'] == 'image/png') {
			imagealphablending($new, false);
			imagesavealpha($new, true);
		}
		imagecopyresampled($new, $old, 0, 0, 0, 0, $w, $h, $this->image['width'], $this->image['height']);
		$this->saveImage($new, $dest);
		imagedestroy($old);
		imagedestroy($new);
	}

	private function createNewImage($width, $height) {
		if ($this->image['mime'] == 'image/gif')
			return imagecreate($width, $height);
		return imagecreatetruecolor($width, $height);
	}
	
	private function getResizeDimensions() {
		// if it is greater than 1 then fit the width
		// if ratio is less than 1 then fit the height
		$ratio = $this->image['width'] / $this->image['height'];

		if ($ratio >= 1) {// width constrained
			$newHeight = floor($this->width / $ratio);
			if ($this->stretch == self::UNIFORM && $newHeight > $this->height || $this->stretch == self::UNIFORM_FILL && $newHeight < $this->height)
				return array(floor($this->height * $ratio), $this->height);
			return array($this->width, $newHeight);
		}
		else {// height constrained
			$newWidth = floor($this->height * $ratio);
			if ($this->stretch == self::UNIFORM && $newWidth > $this->width || $this->stretch == self::UNIFORM_FILL && $newWidth < $this->width)
				return array($this->width, floor($this->width / $ratio));
			return array($newWidth, $this->height);
		}
	}
	
	private function setDetails($path) {
		$d = getimagesize($path);
		if ($d) {
			$this->image['path'] = $path;
			$this->image['width'] = $d[0];
			$this->image['height'] = $d[1];
			$this->image['mime'] = $d['mime'];
		}
	}
	
	private function createImage() {
		$path = $this->image['path'];
		switch($this->image['mime']) {
			case 'image/jpeg':
				return imagecreatefromjpeg($path);
			case 'image/gif':
				return imagecreatefromgif($path);
			case 'image/png':
				return imagecreatefrompng($path);
		}
	}
	
	private function saveImage($img, $path, $quality = 90) {		
		switch($this->image['mime']) {
			case 'image/jpeg':
				imagejpeg($img, $path, $quality);
				break;
			case 'image/png':
				imagepng($img, $path);
				break;
			case 'image/gif':
				imagegif($img, $path);
				break;
		}
	}
	
}
