import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.main import app


class FakeImage:
    def save(self, *_args, **_kwargs):
        return None


class GenerationEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_generate_returns_only_images_and_defaults_to_one(self):
        with patch("backend.main.text_to_image.generate", return_value=[FakeImage()]) as t2i_generate:
            with patch("backend.main.image_to_video.generate") as i2v_generate:
                response = self.client.post(
                    "/generate",
                    json={"prompt": "test prompt", "negative_prompt": "bad"},
                )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("image_urls", body)
        self.assertNotIn("video_url", body)
        self.assertEqual(len(body["image_urls"]), 1)
        self.assertEqual(t2i_generate.call_args.kwargs["num_images"], 1)
        i2v_generate.assert_not_called()

    def test_generate_image_keeps_image_only_behavior(self):
        with patch("backend.main.text_to_image.generate", return_value=[FakeImage()]) as t2i_generate:
            with patch("backend.main.image_to_video.generate") as i2v_generate:
                response = self.client.post(
                    "/generate/image",
                    json={"prompt": "test prompt"},
                )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("image_urls", body)
        self.assertNotIn("video_url", body)
        self.assertEqual(t2i_generate.call_args.kwargs["num_images"], 1)
        i2v_generate.assert_not_called()

    def test_generate_full_returns_images_and_video(self):
        unload_t2i = MagicMock()
        unload_i2v = MagicMock()

        with patch("backend.main.text_to_image.generate", return_value=[FakeImage()]) as t2i_generate:
            with patch("backend.main.text_to_image.unload_pipeline", unload_t2i):
                with patch("backend.main.image_to_video.generate") as i2v_generate:
                    with patch("backend.main.image_to_video.unload_pipeline", unload_i2v):
                        response = self.client.post(
                            "/generate/full",
                            json={"prompt": "test prompt"},
                        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("image_urls", body)
        self.assertIn("video_url", body)
        self.assertEqual(len(body["image_urls"]), 1)
        self.assertEqual(t2i_generate.call_args.kwargs["num_images"], 1)
        i2v_generate.assert_called_once()
        unload_t2i.assert_called_once()
        unload_i2v.assert_called_once()


if __name__ == "__main__":
    unittest.main()
