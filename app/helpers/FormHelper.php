<?php

class FormHelper extends UIHelper {
	public static function selected($condition) {
		return self::display('selected="selected"', $condition);
	}

	public static function checked($condition) {
		return self::display('checked="checked"', $condition);
	}
}
