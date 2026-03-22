import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.debug_flow import clear_trace_events, get_trace_events
from backend.main import app


class FakeImage:
    def save(self, *_args, **_kwargs):
        return None


class GenerationEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        clear_trace_events()

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
                    headers={"X-Request-ID": "req-123"},
                    json={"prompt": "test prompt"},
                )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("image_urls", body)
        self.assertNotIn("video_url", body)
        self.assertEqual(t2i_generate.call_args.kwargs["num_images"], 1)
        self.assertEqual(t2i_generate.call_args.kwargs["trace_context"]["request_id"], "req-123")
        self.assertEqual(response.headers["X-Request-ID"], "req-123")
        i2v_generate.assert_not_called()

    def test_generate_ex_image_calls_ex_module_and_returns_images(self):
        ex_module = MagicMock()
        ex_module.generate_images.return_value = [FakeImage()]

        with patch("backend.main._get_ex_module", return_value=ex_module):
            response = self.client.post(
                "/generate/ex-image",
                headers={"X-Request-ID": "req-ex"},
                json={"prompt": "test prompt"},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("image_urls", body)
        self.assertEqual(len(body["image_urls"]), 1)
        self.assertEqual(response.headers["X-Request-ID"], "req-ex")
        ex_module.generate_images.assert_called_once()
        self.assertEqual(ex_module.generate_images.call_args.kwargs["prompt"], "test prompt")
        self.assertEqual(ex_module.generate_images.call_args.kwargs["negative_prompt"], "cartoon, deformed")
        self.assertEqual(ex_module.generate_images.call_args.kwargs["num_images"], 1)
        self.assertIsNone(ex_module.generate_images.call_args.kwargs["seed"])

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

    def test_generate_image_records_terminal_error_trace(self):
        client = TestClient(app, raise_server_exceptions=False)

        with patch("backend.main.text_to_image.generate", side_effect=RuntimeError("generation failed")):
            response = client.post(
                "/generate/image",
                headers={"X-Request-ID": "req-error"},
                json={"prompt": "test prompt"},
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.headers["X-Request-ID"], "req-error")

        trace_events = get_trace_events("req-error")
        self.assertTrue(any(event["stage"] == "request_failed" and event["status"] == "error" for event in trace_events))


if __name__ == "__main__":
    unittest.main()
