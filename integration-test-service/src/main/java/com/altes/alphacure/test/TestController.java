package com.altes.alphacure.test;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tests")
public class TestController {
    private final TestOrchestrator orchestrator;

    public TestController(TestOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    @PostMapping("/run")
    public Map<String, Object> runTest(@RequestParam(defaultValue = "10") int count) {
        return orchestrator.runFullCycle(count);
    }
}
