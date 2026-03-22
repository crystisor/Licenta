import importlib.util
import unittest
from pathlib import Path


def load_ex_module():
    ex_path = Path(__file__).resolve().parents[2] / "ex.py"
    spec = importlib.util.spec_from_file_location("test_ex_module", ex_path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Unable to load ex.py from {ex_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ExModuleContractTests(unittest.TestCase):
    def test_ex_module_exports_generate_images(self):
        module = load_ex_module()

        self.assertTrue(hasattr(module, "generate_images"))
        self.assertTrue(callable(module.generate_images))

    def test_generate_images_rejects_empty_prompt_before_runtime_load(self):
        module = load_ex_module()

        with self.assertRaisesRegex(ValueError, "Prompt must not be empty."):
            module.generate_images("   ")


if __name__ == "__main__":
    unittest.main()
