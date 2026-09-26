"""
Redis Queue (RQ) Manager for Background Tasks.
"""
from redis.asyncio import Redis
from rq import Queue
from config import settings
import logging

logger = logging.getLogger(__name__)


class BackgroundQueueManager:
    """
    Coordinates Redis-backed RQ job queues.
    """

    _sync_redis = None
    _queue = None

    @classmethod
    def get_redis_sync(cls):
        """
        RQ requires a synchronous Redis connection.
        """
        if cls._sync_redis is None:
            import redis
            cls._sync_redis = redis.from_url(settings.REDIS_URL)
            logger.info("Synchronous Redis connection established for RQ.")
        return cls._sync_redis

    @classmethod
    def get_queue(cls, queue_name: str = "geocap-tasks") -> Queue:
        """
        Return the RQ queue instance.
        """
        if cls._queue is None:
            r = cls.get_redis_sync()
            cls._queue = Queue(queue_name, connection=r)
            logger.info(f"RQ Queue '{queue_name}' initialized.")
        return cls._queue

    @classmethod
    def enqueue_task(cls, func, *args, **kwargs):
        """
        Enqueue a function to run asynchronously.
        """
        q = cls.get_queue()
        job = q.enqueue(func, *args, **kwargs)
        logger.info(f"Task enqueued: job_id={job.id} func={func.__name__}")
        return job.id
